# Tasks

## 1. Bring up the bench board

- [x] 1.1 Identify the attached ESP32-S3 and its USB serial port. Confirm the current firmware can be restored before overwriting it. Verify the ESP-IDF toolchain and USB flash and monitor workflow.
- [x] 1.2 Add serial provisioning for Wi-Fi and the scoped receiver token. Transfer the active Wi-Fi profile directly from the PC without printing secrets. Persist settings across reboot and verify separate Wi-Fi connected, MQTT connected, and inbox ready logs.

## 2. Build the test path

- [x] 2.1 Add the localhost browser page. Accept the scoped sender credential at runtime and send a fixed, non-retained QoS 1 message with a fresh ID. Show broker acknowledgment without claiming device receipt.
- [x] 2.2 Add the ESP32 MQTT/TLS receiver with certificate verification, a stable client ID, session recovery, and serial logging of the received ID and payload. Keep printer code out of the build.

## 3. Verify and record results

- [x] 3.1 Send from a browser on a different network. Match the browser test ID and payload to the ESP32 log.
- [x] 3.2 Run Wi-Fi interruption and power-cycle checks separately. Establish the subscription, send while the ESP32 is offline, and verify session resume and matching receipt without resubscribing.
- [x] 3.3 Use a fresh client ID to verify that the ESP32 logs the absent session, subscribes, and receives a new live message.
- [x] 3.4 Record conditions, outcomes, and gaps in `results.md`. Check off the roadmap step once verified.
