# Tasks

## 1. Prove secure delivery with local keys

- [x] 1.1 Define the versioned bench envelope and shared fixtures. Check the bounded payload size on the ESP32-S3. Include exact encodings and known expected raster hashes.
- [x] 1.2 Generate client-owned keys and exchange public keys through the localhost page and USB provisioning. Send a signed, encrypted raster to the ESP32 and verify the job ID and expected sink hash over serial.
- [x] 1.3 Verify rejection of tampered, unauthorized, misaddressed, expired, and malformed jobs. Verify the accepted ID survives reboot, live IDs are not evicted when all 32 slots are full, and expired records can be reclaimed.

## 2. Repeat with retained records

- [x] 2.1 Provision the administrator, browser, and two device roles on flespi. Publish complete retained membership and key records and verify that browsers cannot approve their own keys and devices cannot change another member's records.
- [x] 2.2 Use retained recipient keys in the browser and retained membership and signing keys at the receiver. Verify acceptance with the sender's device offline. After receiver reconnect, verify that a queued job waits for fresh authorization, that only one can wait, and that missing records time out without acceptance.
- [x] 2.3 Queue jobs while the receiver is offline. Revoke a signing key and remove a member in separate cases. Verify neither job reaches the sink after reconnect. Record the bench setup, results, and gaps in `results.md` and check off the roadmap step after verification.
