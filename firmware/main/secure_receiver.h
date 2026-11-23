#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

void tf_receiver_start(void);
void tf_receiver_job(const uint8_t *data, size_t len);
void tf_receiver_authorized_job(const uint8_t *data, size_t len, const uint8_t key_id[16], const uint8_t public_key[65]);
bool tf_receiver_directory_mode(void);
uint16_t tf_receiver_next_lookup(void);
void tf_receiver_console(char command);
