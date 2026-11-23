#pragma once

#include <stdbool.h>
#include "mqtt_client.h"

void tf_directory_init(void);
void tf_directory_connection(esp_mqtt_client_handle_t client);
bool tf_directory_receive(esp_mqtt_event_handle_t event);
void tf_directory_tick(void);
