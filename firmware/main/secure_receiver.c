#include "secure_receiver.h"
#include "secure_job.h"

#include <stdbool.h>
#include <string.h>
#include <time.h>

#include "driver/usb_serial_jtag.h"
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "nvs.h"

#define REPLAY_CAP 32

static const char *tag = "secure_job";
static const uint8_t recipient[16] = {2};
static const uint8_t sender[16] = {1};
static const uint8_t recipient_key[16] = {4};
static const uint8_t signer[16] = {3};
static nvs_handle_t storage;
static SemaphoreHandle_t lock;
static uint8_t private_key[32], public_key[65], approved[65];
static bool signer_ready;
static uint8_t directory_mode;

struct replay_entry {
    uint8_t sender[16];
    uint8_t id[16];
    uint32_t expiry;
};

static struct replay_entry replay[REPLAY_CAP];

static void hex_encode(const uint8_t *bytes, size_t len, char *out)
{
    static const char digits[] = "0123456789abcdef";
    for (size_t i = 0; i < len; i++) {
        *out++ = digits[bytes[i] >> 4];
        *out++ = digits[bytes[i] & 15];
    }
    *out = 0;
}

static int nibble(char c)
{
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
}

static bool blob_exists(const char *name, void *value, size_t size)
{
    size_t len = size;
    esp_err_t err = nvs_get_blob(storage, name, value, &len);
    if (err == ESP_ERR_NVS_NOT_FOUND) return false;
    ESP_ERROR_CHECK(err);
    ESP_ERROR_CHECK(len == size ? ESP_OK : ESP_ERR_INVALID_SIZE);
    return true;
}

void tf_receiver_start(void)
{
    lock = xSemaphoreCreateMutex();
    ESP_ERROR_CHECK(lock ? ESP_OK : ESP_ERR_NO_MEM);
    ESP_ERROR_CHECK(nvs_open("tinyfax-secure", NVS_READWRITE, &storage));
    uint8_t identity[97];
    if (!blob_exists("identity", identity, sizeof(identity))) {
        ESP_ERROR_CHECK(tf_generate_receiver_key(identity, identity + 32) == 0 ? ESP_OK : ESP_FAIL);
        ESP_ERROR_CHECK(nvs_set_blob(storage, "identity", identity, sizeof(identity)));
        ESP_ERROR_CHECK(nvs_commit(storage));
    }
    memcpy(private_key, identity, sizeof(private_key));
    memcpy(public_key, identity + 32, sizeof(public_key));
    explicit_bzero(identity, sizeof(identity));
    signer_ready = blob_exists("signer", approved, sizeof(approved));
    blob_exists("replay", replay, sizeof(replay));
    blob_exists("directory", &directory_mode, sizeof(directory_mode));
}

static const char *record_job(const struct tf_job *job, uint32_t now)
{
    int slot = -1;
    for (int i = 0; i < REPLAY_CAP; i++) {
        if (replay[i].expiry <= now) {
            if (slot < 0) slot = i;
        } else if (!memcmp(job->sender, replay[i].sender, 16) && !memcmp(job->id, replay[i].id, 16)) {
            return "duplicate";
        }
    }
    if (slot < 0) return "replay store full";
    struct replay_entry previous = replay[slot];
    struct replay_entry *entry = &replay[slot];
    memcpy(entry->sender, job->sender, 16);
    memcpy(entry->id, job->id, 16);
    entry->expiry = job->expiry;
    if (nvs_set_blob(storage, "replay", replay, sizeof(replay)) != ESP_OK || nvs_commit(storage) != ESP_OK) {
        *entry = previous;
        return "replay storage";
    }
    return NULL;
}

bool tf_receiver_directory_mode(void)
{
    return directory_mode != 0;
}

uint16_t tf_receiver_next_lookup(void)
{
    uint16_t generation = 0;
    xSemaphoreTake(lock, portMAX_DELAY);
    blob_exists("lookup", &generation, sizeof(generation));
    if (generation == UINT16_MAX || nvs_set_blob(storage, "lookup", &(uint16_t){generation + 1}, sizeof(generation)) != ESP_OK ||
        nvs_commit(storage) != ESP_OK) {
        generation = 0;
    } else {
        generation++;
    }
    xSemaphoreGive(lock);
    return generation;
}

static void receive_job(const uint8_t *data, size_t len, const uint8_t *key_id, const uint8_t *key)
{
    struct tf_job job;
    uint32_t now = time(NULL);
    xSemaphoreTake(lock, portMAX_DELAY);
    if (!key && !directory_mode && signer_ready) {
        key = approved;
        key_id = signer;
    }
    const char *error = key ? tf_verify_job(data, len, now, recipient, recipient_key,
                                           sender, key_id, key, private_key, &job) : "authorization";
    if (!error) error = record_job(&job, now);
    xSemaphoreGive(lock);
    if (error) {
        ESP_LOGW(tag, "Job rejected: %s", error);
        return;
    }
    char id[33], hash[65];
    hex_encode(job.id, sizeof(job.id), id);
    hex_encode(job.raster_hash, sizeof(job.raster_hash), hash);
    ESP_LOGI(tag, "Job accepted: id=%s raster_sha256=%s", id, hash);
}

void tf_receiver_job(const uint8_t *data, size_t len)
{
    receive_job(data, len, NULL, NULL);
}

void tf_receiver_authorized_job(const uint8_t *data, size_t len, const uint8_t key_id[16], const uint8_t key[65])
{
    if (!directory_mode) return;
    receive_job(data, len, key_id, key);
}

void tf_receiver_console(char command)
{
    if (command == '@') {
        const uint8_t next = !directory_mode;
        xSemaphoreTake(lock, portMAX_DELAY);
        esp_err_t result = nvs_set_blob(storage, "directory", &next, sizeof(next));
        if (result == ESP_OK) result = nvs_commit(storage);
        xSemaphoreGive(lock);
        if (result == ESP_OK) esp_restart();
        ESP_LOGE(tag, "Could not change directory mode");
        return;
    }
    if (command == '?') {
        char hex[131];
        hex_encode(public_key, sizeof(public_key), hex);
        ESP_LOGI(tag, "Receiver public key: %s", hex);
        return;
    }
    if (command != '+') return;
    uint8_t candidate[65];
    for (size_t i = 0; i < sizeof(candidate); i++) {
        char hi, lo;
        if (usb_serial_jtag_read_bytes(&hi, 1, pdMS_TO_TICKS(1000)) != 1 ||
            usb_serial_jtag_read_bytes(&lo, 1, pdMS_TO_TICKS(1000)) != 1 ||
            nibble(hi) < 0 || nibble(lo) < 0) {
            ESP_LOGW(tag, "Invalid signing key input");
            return;
        }
        candidate[i] = (nibble(hi) << 4) | nibble(lo);
    }
    if (candidate[0] != 4) {
        ESP_LOGW(tag, "Invalid signing key format");
        return;
    }
    xSemaphoreTake(lock, portMAX_DELAY);
    esp_err_t err = nvs_set_blob(storage, "signer", candidate, sizeof(candidate));
    if (err == ESP_OK) err = nvs_commit(storage);
    if (err == ESP_OK) {
        memcpy(approved, candidate, sizeof(approved));
        signer_ready = true;
    }
    xSemaphoreGive(lock);
    ESP_LOGI(tag, "%s", err == ESP_OK ? "Signing key approved" : "Signing key not saved");
}
