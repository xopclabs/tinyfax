#include <stdio.h>
#include <string.h>

#include "cJSON.h"
#include "driver/usb_serial_jtag.h"
#include "freertos/FreeRTOS.h"
#include "esp_crt_bundle.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_netif_sntp.h"
#include "esp_wifi.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include "mqtt_client.h"
#include "mqtt5_client.h"
#include "nvs_flash.h"

static const char *tag = "tinyfax";
static const char *inbox = "tinyfax-test/inbox/bob/from/alice";
static EventGroupHandle_t network;
static int subscription_id;
static const EventBits_t has_ip = BIT0;

static void mqtt_event(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    esp_mqtt_event_handle_t event = data;
    switch (id) {
    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(tag, "MQTT connected");
        if (event->session_present) {
            ESP_LOGI(tag, "Inbox ready (session resumed)");
        } else {
            ESP_LOGI(tag, "MQTT session absent; subscribing");
            subscription_id = esp_mqtt_client_subscribe(event->client, inbox, 1);
            if (subscription_id < 0) {
                ESP_LOGE(tag, "Inbox subscribe could not be sent");
            }
        }
        break;
    case MQTT_EVENT_SUBSCRIBED:
        if (subscription_id == event->msg_id && event->data_len == 1 && event->data[0] == 1) {
            ESP_LOGI(tag, "Inbox ready (QoS 1 subscribed)");
        } else {
            ESP_LOGE(tag, "Inbox subscribe was not granted at QoS 1");
        }
        break;
    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGI(tag, "MQTT disconnected");
        break;
    case MQTT_EVENT_DATA:
        if (event->current_data_offset == 0 && event->data_len == event->total_data_len &&
            event->data_len > 0 && event->data_len <= 128 && !event->retain) {
            const char *separator = memchr(event->data, ' ', event->data_len);
            if (separator && separator > event->data) {
                const char *payload = separator + 1;
                int payload_len = event->data_len - (payload - event->data);
                if (payload_len == sizeof("tinyfax transport test") - 1 &&
                    !memcmp(payload, "tinyfax transport test", payload_len)) {
                    ESP_LOGI(tag, "Device receipt: id=%.*s payload=%.*s", (int)(separator - event->data),
                             event->data, payload_len, payload);
                }
            }
        }
        break;
    }
}

struct settings {
    char ssid[33];
    char password[65];
    char token[512];
};

static bool read_field(const cJSON *json, const char *name, char *out, size_t size)
{
    const cJSON *field = cJSON_GetObjectItemCaseSensitive(json, name);
    if (!cJSON_IsString(field) || strlen(field->valuestring) >= size) {
        return false;
    }
    strcpy(out, field->valuestring);
    return true;
}

static void load_settings(struct settings *settings)
{
    nvs_handle_t store;
    ESP_ERROR_CHECK(nvs_open("tinyfax", NVS_READWRITE, &store));
    size_t size = sizeof(*settings);
    esp_err_t result = nvs_get_blob(store, "bench", settings, &size);
    bool saved = result == ESP_OK && size == sizeof(*settings);
    ESP_ERROR_CHECK(saved || result == ESP_ERR_NVS_NOT_FOUND ? ESP_OK :
                    result == ESP_OK ? ESP_ERR_INVALID_SIZE : result);

    usb_serial_jtag_driver_config_t usb = USB_SERIAL_JTAG_DRIVER_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(usb_serial_jtag_driver_install(&usb));
    ESP_LOGI(tag, "USB provisioning ready");
    char line[1400];
    size_t used = 0;
    for (;;) {
        char byte;
        if (usb_serial_jtag_read_bytes(&byte, 1, saved ? pdMS_TO_TICKS(5000) : portMAX_DELAY) != 1) {
            if (saved) {
                nvs_close(store);
                return;
            }
            continue;
        }
        if (byte != '\n' && byte != '\r') {
            if (used < sizeof(line) - 1) {
                line[used++] = byte;
            }
            continue;
        }
        if (!used) {
            continue;
        }
        line[used] = 0;
        cJSON *json = used < sizeof(line) - 1 ? cJSON_ParseWithOpts(line, NULL, true) : NULL;
        used = 0;
        struct settings next = {0};
        bool ok = read_field(json, "ssid", next.ssid, sizeof(next.ssid)) &&
                  read_field(json, "password", next.password, sizeof(next.password)) &&
                  read_field(json, "token", next.token, sizeof(next.token)) &&
                  next.ssid[0] && next.token[0];
        cJSON_Delete(json);
        memset(line, 0, sizeof(line));
        if (!ok) {
            ESP_LOGW(tag, "Invalid provisioning input");
            continue;
        }
        *settings = next;
        ESP_ERROR_CHECK(nvs_set_blob(store, "bench", settings, sizeof(*settings)));
        ESP_ERROR_CHECK(nvs_commit(store));
        nvs_close(store);
        ESP_LOGI(tag, "Provisioning saved");
        return;
    }
}

static void network_event(void *arg, esp_event_base_t base, int32_t id, void *data)
{
    if (base == WIFI_EVENT && (id == WIFI_EVENT_STA_START || id == WIFI_EVENT_STA_DISCONNECTED)) {
        esp_wifi_connect();
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ESP_LOGI(tag, "Wi-Fi connected");
        xEventGroupSetBits(network, has_ip);
    }
}

void app_main(void)
{
    ESP_LOGI(tag, "USB console ready");
    ESP_ERROR_CHECK(nvs_flash_init());
    struct settings settings = {0};
    load_settings(&settings);
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t init = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init));
    ESP_ERROR_CHECK(esp_wifi_set_storage(WIFI_STORAGE_RAM));
    network = xEventGroupCreate();
    ESP_ERROR_CHECK(network ? ESP_OK : ESP_ERR_NO_MEM);
    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, network_event, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, network_event, NULL));
    wifi_config_t config = {0};
    memcpy(config.sta.ssid, settings.ssid, strlen(settings.ssid));
    memcpy(config.sta.password, settings.password, strlen(settings.password));
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &config));
    ESP_ERROR_CHECK(esp_wifi_start());
    xEventGroupWaitBits(network, has_ip, pdFALSE, pdTRUE, portMAX_DELAY);

    esp_sntp_config_t ntp = ESP_NETIF_SNTP_DEFAULT_CONFIG("pool.ntp.org");
    ESP_ERROR_CHECK(esp_netif_sntp_init(&ntp));
    while (esp_netif_sntp_sync_wait(pdMS_TO_TICKS(10000)) != ESP_OK) {
        ESP_LOGW(tag, "Waiting for clock sync before MQTT/TLS");
    }

    uint8_t mac[6];
    ESP_ERROR_CHECK(esp_wifi_get_mac(WIFI_IF_STA, mac));
    char client_id[48];
    snprintf(client_id, sizeof(client_id), "tinyfax-rx-%02x%02x%02x%02x%02x%02x",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    const esp_mqtt_client_config_t mqtt = {
        .broker.address.uri = "mqtts://mqtt.flespi.io:8883",
        .broker.verification.crt_bundle_attach = esp_crt_bundle_attach,
        .credentials.client_id = client_id,
        .credentials.username = settings.token,
        .session.protocol_ver = MQTT_PROTOCOL_V_5,
        .session.disable_clean_session = true,
        .session.keepalive = 10,
    };
    esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt);
    ESP_ERROR_CHECK(client ? ESP_OK : ESP_ERR_NO_MEM);
    esp_mqtt5_connection_property_config_t session = {.session_expiry_interval = 600};
    ESP_ERROR_CHECK(esp_mqtt5_client_set_connect_property(client, &session));
    ESP_ERROR_CHECK(esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event, NULL));
    ESP_ERROR_CHECK(esp_mqtt_client_start(client));

    // The bench console can interrupt Wi-Fi while the board stays powered.
    for (;;) {
        char command;
        if (usb_serial_jtag_read_bytes(&command, 1, portMAX_DELAY) == 1 && command == '!') {
            ESP_ERROR_CHECK(esp_wifi_stop());
            ESP_LOGI(tag, "Wi-Fi interruption started (40 seconds)");
            vTaskDelay(pdMS_TO_TICKS(40000));
            ESP_ERROR_CHECK(esp_wifi_start());
        }
    }
}
