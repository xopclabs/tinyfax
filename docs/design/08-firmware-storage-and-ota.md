# Firmware, persistence, and OTA

## Platform assumptions

The primary firmware target is an inexpensive **ESP32-S3 SuperMini**. A basic board with **4 MB flash and no PSRAM** was considered a viable target, not a proven final fit. Wi-Fi, USB printing, TLS/MQTT, crypto, a simple local management server, and A/B OTA should be possible, but the final application size and memory profile must be checked on the actual board. An 8 MB variant offers more margin, but minimizing hardware cost is intentional.

ESP-IDF was favored for control over USB, storage partitions, Wi-Fi/AP state, MQTT, cryptography and OTA. A specific framework version, build configuration, module API, and repository structure were not finalized.

## Persistence model — agreed

Firmware updates and ordinary resets must never erase or silently regenerate the printer's permanent identity.

| Storage domain | Logical contents | Behavior across normal OTA |
|---|---|---|
| Permanent identity | Stable member/printer ID, device MQTT credentials, printer decryption private key/public-key identity | **Preserve** |
| Mutable settings | Wi-Fi credentials, approved policies, local management configuration, blocklist, settings versions | **Preserve**, with careful migrations |
| Print spool / job state | Incoming verified jobs, partially transferred jobs if applicable, recent completed IDs | **Preserve**, subject to size/retention rules |
| OTA app slots | Executable firmware A and B | Replace inactive slot only |
| OTA metadata | Selected app and rollback status | Maintained by OTA/bootloader |

One proposed layout used separate NVS partitions for immutable identity and mutable settings, plus LittleFS for print data. That separation is conceptually preferred; exact partition CSV, offsets, sizes, and whether Wi-Fi uses standard/default NVS versus a custom namespace are not yet specified.

**Critical behavior:** an error reading an existing identity is a recovery error. Firmware must not interpret arbitrary NVS corruption as “new printer, generate a replacement private key.” A newly generated encryption key would make existing ciphertext sent to the previous public key unreadable.

## Dual-slot application OTA

```text
Bootloader + partition table
OTA metadata
Permanent identity (NVS)
Mutable settings (NVS)
OTA app slot A    <- running known-good image
OTA app slot B    <- incoming image
LittleFS / other bounded job storage
```

A standard application OTA writes the new firmware to the **inactive app slot**; persistent NVS/filesystem partitions remain untouched. The bootloader then selects the new slot. With rollback enabled, the new app starts in a pending-verification state and explicitly confirms that basic startup succeeded, otherwise a reset can revert to the previous known-good app.

ESP-IDF mechanisms discussed include `esp_https_ota()`, `esp_ota_mark_app_valid_cancel_rollback()` and signed application verification. A successful boot check should include loading the preserved identity and bringing up core local recovery capabilities; a live broker or physically available printer may not always be present.

### Release distribution and update signals

- **GitHub Releases or equivalent immutable public release hosting** was preferred for firmware binaries and manifest information.
- A small, privileged MQTT `check_update` command can prompt online printers to check a trusted update source.
- Devices can also check on boot or periodically, so an offline printer eventually learns about an update.
- Firmware is downloaded over validated HTTPS into the inactive OTA slot; the MQTT message carries only a trigger/version hint, **not the binary image**.
- Verification must establish authenticity and correct target (S3 variant, partition compatibility, release channel as appropriate); a received MQTT command should not be able to redirect the ESP32 to arbitrary executable code.
- Rollback and non-destructive configuration migrations are part of the intended update model.

**Trust caveat:** a maintainer authorized to sign and distribute device firmware remains a meaningful trust authority. Signed OTA protects against unauthorized firmware but does not eliminate the user's trust in that maintainer.

## Data compatibility across firmware versions

A/B OTA can roll back application binaries, but **cannot automatically roll back NVS/filesystem schema migrations**. New firmware should use versioned data structures and backward-compatible transitions where possible; irreversible migrations before an update is confirmed could prevent old firmware from recovering. The precise schema and migration policy were not designed.

Application OTA normally does not replace the bootloader or the partition table. Changing partition boundaries later can endanger the permanent-key partition. Finalizing a workable 4 MB partition scheme is an important *design constraint*, not a reason to reset identity during updates.

## Storage pressure on inexpensive boards

With a 4 MB device, two app slots of roughly 1.5–1.7 MB each leave limited room for identity, other partitions and print data. These sizes are **examples**, not a validated partition layout. The complete firmware includes Wi-Fi, MQTT/TLS, USB host/peripheral communication as implemented, cryptographic libraries, and a local server, so fit must be measured from the actual build.

External PSRAM is not logically necessary if images are processed and stored in bounded chunks. RAM is volatile and should not be the only storage for jobs that must survive reboot. Flash capacity, filesystem write patterns and broker-side queues together determine practical message limits.

## Secure storage nuance

A private key in NVS survives OTA, but plaintext NVS is not protected against physical flash extraction. NVS encryption and hardware security facilities were mentioned as optional security improvements; they were **not** agreed prerequisites for the low-cost, trusted-friends v1. Whichever storage scheme is selected, accidental full flash erasure still loses the key unless a separate backup/re-provisioning strategy exists.

## Web UI assets

The local administrative page might be embedded in the firmware or stored in a dedicated filesystem. Both were contemplated. Updating files separately from firmware is possible but introduces a separate authenticated delivery and compatibility mechanism. No requirement was agreed to build a second, independent web-asset OTA channel.
