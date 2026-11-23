#include "secure_job.h"

#include <string.h>

#include "esp_random.h"
#include "mbedtls/ecdh.h"
#include "mbedtls/ecdsa.h"
#include "mbedtls/gcm.h"
#include "mbedtls/md.h"
#include "mbedtls/platform_util.h"
#include "mbedtls/sha256.h"

static const uint8_t signature_domain[] = "tinyfax/bench-job/v1/sign";
static const uint8_t aes_info[] = "tinyfax/bench-job/v1/aes-gcm";

static int random_bytes(void *context, unsigned char *out, size_t len)
{
    (void)context;
    esp_fill_random(out, len);
    return 0;
}

int tf_generate_receiver_key(uint8_t private_key[32], uint8_t public_key[65])
{
    mbedtls_ecp_group group;
    mbedtls_ecp_point point;
    mbedtls_mpi scalar;
    size_t size = 0;
    mbedtls_ecp_group_init(&group);
    mbedtls_ecp_point_init(&point);
    mbedtls_mpi_init(&scalar);
    int rc = mbedtls_ecp_group_load(&group, MBEDTLS_ECP_DP_SECP256R1);
    if (!rc) rc = mbedtls_ecdh_gen_public(&group, &scalar, &point, random_bytes, NULL);
    if (!rc) rc = mbedtls_mpi_write_binary(&scalar, private_key, 32);
    if (!rc) rc = mbedtls_ecp_point_write_binary(&group, &point, MBEDTLS_ECP_PF_UNCOMPRESSED, &size, public_key, 65);
    mbedtls_mpi_free(&scalar);
    mbedtls_ecp_point_free(&point);
    mbedtls_ecp_group_free(&group);
    return rc ? rc : size == 65 ? 0 : -1;
}

static uint32_t be32(const uint8_t *p)
{
    return (uint32_t)p[0] << 24 | (uint32_t)p[1] << 16 | (uint32_t)p[2] << 8 | p[3];
}

static unsigned be16(const uint8_t *p)
{
    return (unsigned)p[0] << 8 | p[1];
}

static int read_point(const mbedtls_ecp_group *group, mbedtls_ecp_point *point, const uint8_t *raw)
{
    if (raw[0] != 4) return -1;
    int rc = mbedtls_ecp_point_read_binary(group, point, raw, 65);
    return rc ? rc : mbedtls_ecp_check_pubkey(group, point);
}

const char *tf_verify_job(const uint8_t *data, size_t len, uint32_t now,
                         const uint8_t recipient[16], const uint8_t recipient_key[16],
                         const uint8_t sender[16], const uint8_t signer[16],
                         const uint8_t signing_public[65], const uint8_t private_key[32],
                         struct tf_job *out)
{
    if (len < 255 || len > TF_JOB_MAX || memcmp(data, "TFJ\x01", 4)) return "envelope";
    unsigned raster_len = be16(data + 169);
    if (raster_len < 4 || len != 171 + raster_len + 16 + 64) return "length";
    if (memcmp(data + 20, recipient, 16) || memcmp(data + 52, recipient_key, 16)) return "recipient";
    if (memcmp(data + 4, sender, 16) || memcmp(data + 36, signer, 16)) return "authorization";
    uint32_t issued = be32(data + 84), expiry = be32(data + 88);
    if (expiry <= now || expiry <= issued || expiry - issued != 600 || expiry - now > 600) return "expiry";

    const char *error = "signature";
    uint8_t digest[32], secret[32], prk[32], aes_key[32];
    // The receiver serializes verification calls.
    static uint8_t raster[TF_JOB_RASTER_MAX];
    uint8_t expand[sizeof(aes_info)];
    memcpy(expand, aes_info, sizeof(aes_info) - 1);
    expand[sizeof(expand) - 1] = 1;
    mbedtls_sha256_context hash;
    mbedtls_ecp_group group;
    mbedtls_ecp_point point;
    mbedtls_mpi r, s;
    mbedtls_gcm_context gcm;
    mbedtls_sha256_init(&hash);
    mbedtls_ecp_group_init(&group);
    mbedtls_ecp_point_init(&point);
    mbedtls_mpi_init(&r);
    mbedtls_mpi_init(&s);
    mbedtls_gcm_init(&gcm);
    const uint8_t *sig = data + len - 64;
    if (mbedtls_ecp_group_load(&group, MBEDTLS_ECP_DP_SECP256R1) ||
        read_point(&group, &point, signing_public) ||
        mbedtls_sha256_starts(&hash, 0) ||
        mbedtls_sha256_update(&hash, signature_domain, sizeof(signature_domain) - 1) ||
        mbedtls_sha256_update(&hash, data, len - 64) || mbedtls_sha256_finish(&hash, digest) ||
        mbedtls_mpi_read_binary(&r, sig, 32) || mbedtls_mpi_read_binary(&s, sig + 32, 32) ||
        mbedtls_ecdsa_verify(&group, digest, sizeof(digest), &point, &r, &s)) goto cleanup;

    error = "encryption";
    const uint8_t *nonce = data + 157;
    const mbedtls_md_info_t *sha256 = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    if (read_point(&group, &point, data + 92) ||
        mbedtls_mpi_read_binary(&r, private_key, 32) || mbedtls_ecp_check_privkey(&group, &r) ||
        mbedtls_ecdh_compute_shared(&group, &s, &point, &r, random_bytes, NULL) ||
        mbedtls_mpi_write_binary(&s, secret, sizeof(secret)) || !sha256 ||
        mbedtls_md_hmac(sha256, nonce, 12, secret, sizeof(secret), prk) ||
        mbedtls_md_hmac(sha256, prk, sizeof(prk), expand, sizeof(expand), aes_key) ||
        mbedtls_gcm_setkey(&gcm, MBEDTLS_CIPHER_ID_AES, aes_key, 256) ||
        mbedtls_gcm_auth_decrypt(&gcm, raster_len, nonce, 12, data, 171,
                                data + 171 + raster_len, 16, data + 171, raster)) goto cleanup;

    error = "raster";
    unsigned width = be16(raster), height = be16(raster + 2);
    unsigned stride = (width + 7) / 8;
    if (!width || !height || stride * height != raster_len - 4) goto cleanup;
    if (width % 8) {
        unsigned mask = (1u << (8 - width % 8)) - 1;
        for (unsigned row = 0; row < height; row++) {
            if (raster[4 + (row + 1) * stride - 1] & mask) goto cleanup;
        }
    }
    if (mbedtls_sha256(raster + 4, raster_len - 4, out->raster_hash, 0)) goto cleanup;
    memcpy(out->sender, data + 4, 16);
    memcpy(out->id, data + 68, 16);
    out->expiry = expiry;
    error = NULL;

cleanup:
    mbedtls_platform_zeroize(secret, sizeof(secret));
    mbedtls_platform_zeroize(prk, sizeof(prk));
    mbedtls_platform_zeroize(aes_key, sizeof(aes_key));
    mbedtls_platform_zeroize(raster, sizeof(raster));
    mbedtls_gcm_free(&gcm);
    mbedtls_mpi_free(&s);
    mbedtls_mpi_free(&r);
    mbedtls_ecp_point_free(&point);
    mbedtls_ecp_group_free(&group);
    mbedtls_sha256_free(&hash);
    return error;
}
