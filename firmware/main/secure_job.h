#pragma once

#include <stddef.h>
#include <stdint.h>

#define TF_JOB_RASTER_MAX 4096
#define TF_JOB_MAX (171 + TF_JOB_RASTER_MAX + 16 + 64)

struct tf_job {
    uint8_t sender[16];
    uint8_t id[16];
    uint32_t expiry;
    uint8_t raster_hash[32];
};

int tf_generate_receiver_key(uint8_t private_key[32], uint8_t public_key[65]);
const char *tf_verify_job(const uint8_t *data, size_t len, uint32_t now,
                         const uint8_t recipient[16], const uint8_t recipient_key[16],
                         const uint8_t sender[16], const uint8_t signer[16],
                         const uint8_t signing_public[65], const uint8_t private_key[32],
                         struct tf_job *out);
