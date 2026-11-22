# Unspecified interfaces and policies

These gaps must not be filled by treating illustrations elsewhere as fixed contracts. This is a design register, not a task plan.

## Broker and network policy

- Provider choice, present plan limits and enforcement: maximum MQTT publication size, WSS support, ACL semantics, retained-message permissions, message expiry, persistent-session expiry, queued-message storage and outages.
- Final topic hierarchy, message versions, explicit per-principal publish/subscribe ACLs, and whether each browser gets its own broker credential or shares a limited member credential.
- Network member directory format, authoritative update behavior, key record deletion/rotation and member removal semantics.
- Whether the broker stores a per-recipient queue on the chosen free plan across reconnects and service restarts, and how queue exhaustion is surfaced.

## Job format and USB semantics

- Actual P21 print width, raster row packing, feed semantics, native USB protocol and keepalive parameters. Those values must be taken from the working P21 USB driver code when available.
- Maximum bitmap height/payload size and whether jobs use one MQTT publication or application-level chunks. If chunked: framing, correlation IDs, ordering, hash validation, resume and partial-job cleanup.
- Canonical signed-envelope serialization, signed fields, lengths, compression (if any), job expiry, receipt schema, replay window and message ID persistence.
- Exact failure transitions for incomplete USB printing and reboot; whether ambiguous output is retried, suppressed or offered as manual reprint.

## Cryptographic protocol and enrollment

- Final algorithm suite and key serialization; P-256/ECDH/HKDF/AES-GCM and ECDSA/SHA-256 are design candidates, not a deployed interoperable format.
- Public-key authentication and cache invalidation, key versioning, cryptographic replay protection, acceptable old-key behavior and verification against revoked keys when delayed messages arrive.
- One-time enrollment token encoding, expiration, device-to-browser response correlation, approval timeouts and transport between local AP and public HTTPS site.
- The exact owner authentication model for sensitive local configuration actions, and broker-side credential rotation/revocation if a shared browser MQTT credential leaks.

## Device lifecycle and storage

- The exact ESP32-S3 variant, flash and PSRAM configuration, compiled firmware size, partition boundaries, filesystem choice, NVS namespaces and storage capacity.
- How the printer boot/power switch causes a predictable ESP32 restart or AP recovery trigger once permanently wired; power rail current, charging path and brownout behavior.
- AP idle/grace timing and behavior when phones associate but cannot open the public enrollment website.
- Whether signed OTA is forced, owner-initiated or automatically applied; trusted manifest format, update versioning, rollback success checks and storage migration rules.
- Backup or repair policy if the device decryption key is physically lost or flash is erased. Routine device recovery explicitly does not erase that key.

## Browser and UX

- Static host/domain, image/text rasterizer, preview details, browser IndexedDB schema, and behavior if browser credentials are lost or revoked.
- Whether sender-facing receipts distinguish accepted-by-broker, accepted-by-printer and USB submission; handling blocked senders and quiet hours if added.

The selected answers should replace the corresponding canonical reference once implemented. Do not copy a complete new specification into this register.
