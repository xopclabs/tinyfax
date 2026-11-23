#include "secure_directory.h"
#include "secure_job.h"
#include "secure_receiver.h"

#include <string.h>

#include "cJSON.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "mqtt5_client.h"

#define TF_DIRECTORY "tinyfax-test/secure-v1"
#define TF_ALICE "01000000000000000000000000000000"
#define TF_BOB "02000000000000000000000000000000"
#define RECORD_MAX 960
#define KEY_MAX 4

static const char *tag = "secure_directory";
static const char *members = TF_DIRECTORY "/members";
static const char *signing = TF_DIRECTORY "/signing/" TF_ALICE;
static SemaphoreHandle_t lock;
static uint16_t lookup_id;
static bool have_members, have_keys, member_allowed;
static struct { uint8_t id[16], public_key[65]; } keys[KEY_MAX];
static size_t key_count, pending_len;
static uint8_t pending[TF_JOB_MAX];
static int64_t deadline;

static bool read_hex(const cJSON *value, uint8_t *dst, size_t count)
{
    const char *s = cJSON_GetStringValue(value);
    if (!s || strlen(s) != 2 * count) return false;
    static const char digits[] = "0123456789abcdef";
    for (size_t i = 0; i < count; i++) {
        const char *hi = strchr(digits, s[2 * i]);
        const char *lo = strchr(digits, s[2 * i + 1]);
        if (!hi || !lo) return false;
        dst[i] = ((hi - digits) << 4) | (lo - digits);
    }
    return true;
}

static void handle_pending(void)
{
    if (!pending_len) return;
    if (esp_timer_get_time() >= deadline) {
        pending_len = 0;
        ESP_LOGW(tag, "Job rejected: directory timeout");
        return;
    }
    if (!have_members || !have_keys) return;
    if (member_allowed && pending_len >= 52) {
        for (size_t i = 0; i < key_count; i++) {
            if (!memcmp(pending + 36, keys[i].id, 16)) {
                tf_receiver_authorized_job(pending, pending_len, keys[i].id, keys[i].public_key);
                pending_len = 0;
                return;
            }
        }
    }
    pending_len = 0;
    ESP_LOGW(tag, "Job rejected: directory authorization");
}

static bool matches(esp_mqtt_event_handle_t e, const char *topic)
{
    return e->topic && e->topic_len == strlen(topic) && !memcmp(e->topic, topic, e->topic_len);
}

static void update_record(esp_mqtt_event_handle_t e, bool membership)
{
    char json[RECORD_MAX + 1];
    cJSON *doc = NULL;
    if (e->current_data_offset == 0 && e->data_len == e->total_data_len &&
        e->data_len > 0 && e->data_len <= RECORD_MAX && !memchr(e->data, 0, e->data_len)) {
        memcpy(json, e->data, e->data_len);
        json[e->data_len] = 0;
        doc = cJSON_ParseWithOpts(json, NULL, true);
    }
    const cJSON *array = cJSON_GetObjectItemCaseSensitive(doc, membership ? "members" : "keys");
    bool valid = cJSON_IsArray(array) && cJSON_GetArraySize(array) <= (membership ? 20 : KEY_MAX);
    const cJSON *item;
    if (membership) {
        member_allowed = false;
        cJSON_ArrayForEach(item, array) {
            const cJSON *id = cJSON_IsObject(item) ? cJSON_GetObjectItemCaseSensitive(item, "id") : item;
            uint8_t decoded[16];
            if (!read_hex(id, decoded, sizeof(decoded))) { valid = false; break; }
            if (!strcmp(id->valuestring, TF_ALICE)) member_allowed = true;
        }
        have_members = valid;
    } else {
        key_count = 0;
        if (valid) cJSON_ArrayForEach(item, array) {
            if (!read_hex(cJSON_GetObjectItemCaseSensitive(item, "id"), keys[key_count].id, 16) ||
                !read_hex(cJSON_GetObjectItemCaseSensitive(item, "key"), keys[key_count].public_key, 65) ||
                keys[key_count].public_key[0] != 4) { valid = false; break; }
            for (size_t i = 0; i < key_count; i++) {
                if (!memcmp(keys[i].id, keys[key_count].id, 16)) valid = false;
            }
            key_count++;
        }
        have_keys = valid;
    }
    cJSON_Delete(doc);
    if (!valid) ESP_LOGW(tag, "Invalid or missing directory record");
}

void tf_directory_init(void)
{
    lock = xSemaphoreCreateMutex();
    ESP_ERROR_CHECK(lock ? ESP_OK : ESP_ERR_NO_MEM);
}

void tf_directory_connection(esp_mqtt_client_handle_t client)
{
    if (!tf_receiver_directory_mode()) return;
    xSemaphoreTake(lock, portMAX_DELAY);
    pending_len = 0;
    have_members = have_keys = false;
    lookup_id = client ? tf_receiver_next_lookup() : 0;
    uint16_t identifier = lookup_id;
    xSemaphoreGive(lock);
    if (!identifier) return;
    const char *job_topic = TF_DIRECTORY "/inbox/" TF_BOB "/from/" TF_ALICE;
    if (esp_mqtt_client_subscribe_single(client, job_topic, 1) < 0) {
        ESP_LOGE(tag, "Secure inbox subscription could not be sent");
    }
    esp_mqtt5_subscribe_property_config_t properties = {.subscribe_id = identifier};
    const esp_mqtt_topic_t topics[] = {{members, 1}, {signing, 1}};
    if (esp_mqtt5_client_set_subscribe_property(client, &properties) != ESP_OK ||
        esp_mqtt_client_subscribe_multiple(client, topics, 2) < 0) {
        ESP_LOGE(tag, "Directory lookup could not be sent");
    }
}

bool tf_directory_receive(esp_mqtt_event_handle_t e)
{
    if (!tf_receiver_directory_mode()) return false;
    bool member_record = matches(e, members);
    bool key_record = matches(e, signing);
    bool job = e->current_data_offset == 0 && e->data_len >= 3 && !memcmp(e->data, "TFJ", 3);
    if (!member_record && !key_record && !job) return false;
    xSemaphoreTake(lock, portMAX_DELAY);
    if (member_record || key_record) {
        if (lookup_id && e->property && e->property->subscribe_id == lookup_id) update_record(e, member_record);
    } else if (e->retain || e->data_len != e->total_data_len || e->data_len > TF_JOB_MAX) {
        ESP_LOGW(tag, "Job rejected: envelope");
    } else if (pending_len) {
        ESP_LOGW(tag, "Job rejected: directory busy");
    } else {
        pending_len = e->data_len;
        memcpy(pending, e->data, pending_len);
        deadline = esp_timer_get_time() + 5000000;
        if (!have_members || !have_keys) ESP_LOGI(tag, "Job waiting for directory records");
    }
    handle_pending();
    xSemaphoreGive(lock);
    return true;
}

void tf_directory_tick(void)
{
    if (!tf_receiver_directory_mode()) return;
    xSemaphoreTake(lock, portMAX_DELAY);
    handle_pending();
    xSemaphoreGive(lock);
}
