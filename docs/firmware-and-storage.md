# Firmware storage and OTA

The partition table and flash capacities are not yet fixed.

## Permanent and mutable data

A printer's MQTT device credentials, stable member/device ID and encryption private key survive normal boots, Wi-Fi changes, browser enrollment/revocation and application OTA. The key is created only when a device is intentionally provisioned as a new identity. If an existing identity fails to load, firmware must report/recover from an identity error, **not** silently generate a replacement decryption key.

The intended logical storage domains are:

| Domain | Contents | Update behavior |
| --- | --- | --- |
| Permanent identity | Member/device ID, printer MQTT secret, encryption key and key ID | Preserved; no routine erase |
| Mutable settings | Home Wi-Fi, local management authorization, blocklist, device preferences | Preserved; migrations need schema compatibility |
| Print state | Stored or partially received jobs, completed/recent IDs | Preserved according to print queue policy |
| Firmware A/B | Two executable app images | Only inactive slot overwritten during OTA |
| OTA selection data | Boot choice and rollback state | Managed by ESP-IDF OTA |

Separate NVS areas for identity and mutable settings, plus a small filesystem/partition for print state, were proposed. The exact layout, encryption-at-rest policy and NVS initialization strategy are open. Plain NVS is not protection against physical flash extraction. A full flash erase can destroy the permanent decryption key and invalidate broker-queued ciphertext; there is no agreed key recovery/backup procedure.

## Application OTA

ESP-IDF can maintain two OTA application slots. The running firmware downloads a new signed release via HTTPS into the inactive app partition, checks authenticity and target compatibility, selects the new partition and reboots. The new firmware reads the same identity and settings partitions. A rollback-enabled bootloader can return to the previous app if the new one fails to confirm healthy startup.

A practical self-check should establish that permanent identity loads, required local recovery services initialize, and saved state can be interpreted. The device should not require an available MQTT broker or a connected P21 at that instant merely to confirm its firmware. A/B rollback changes the app image, **not** old NVS/filesystem data; a new firmware version must avoid destructive migrations that make the previous image unreadable.

GitHub Releases is the intended firmware distribution channel. A privileged MQTT message can request `check_update`; the ESP32 fetches firmware from a configured, trusted release source rather than accepting an arbitrary URL from MQTT. A boot-time or occasional check covers devices that were offline during an MQTT trigger. Release authenticity, trusted signing keys, firmware target, rollback rules and recovery behavior are part of the eventual OTA specification, not assumptions satisfied by HTTPS alone.

Relevant ESP-IDF mechanisms include `esp_https_ota()`, application OTA metadata and `esp_ota_mark_app_valid_cancel_rollback()` when configured for app-controlled rollback. See the [ESP32-S3 OTA reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/ota.html). The installed ESP-IDF version and build configuration are not recorded here.

## Flash and memory limits

The target is a low-cost ESP32-S3 SuperMini, possibly a 4 MB flash part without PSRAM. A/B OTA, USB, Wi-Fi, MQTT/TLS, the local server, cryptography and print storage must all fit on the actual board. Two large app slots leave comparatively little file storage. Partition sizing and free heap still need verification on the integrated appliance firmware.

Receiving a long raster in bounded chunks is preferred over holding the whole image in internal RAM. PSRAM can simplify buffering but is not a functional requirement of the architecture. The print queue may rely partly on broker session storage; it still needs a bounded local lifecycle as defined in [print jobs](print-jobs.md).

A normal app OTA does not change the bootloader or partition-table boundaries. Changing partition offsets after provisioning can destroy the identity partition and requires a separate migration/recovery design.
