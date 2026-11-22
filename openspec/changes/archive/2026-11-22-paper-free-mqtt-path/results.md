# Bench verification

ESP-IDF 5.5.4 flashed an ESP32-S3 with 4 MiB flash and 2 MiB PSRAM over USB Serial/JTAG. The serial monitor confirmed boot. A full flash backup is stored locally outside Git. Reflashing the application left the saved bench provisioning intact. On restart, the device joined 2.4 GHz Wi-Fi, connected to flespi over MQTT/TLS, and reported inbox readiness without receiving credentials over serial again.

- Live delivery passed from headless Chromium on the PC. The localhost page showed broker acknowledgment and the ESP32 logged the matching ID and fixed payload. The PC and ESP32 used different Wi-Fi bands on the same home network. This does not satisfy the off-network check.
- Wi-Fi interruption passed. The USB bench command stopped Wi-Fi for 40 seconds with the board powered. After the ESP32 logged MQTT disconnect, Chromium published a non-retained QoS 1 test message. The ESP32 reported a resumed session and logged the matching ID and payload without a new subscription.
- Missing-session recovery passed with a fresh receiver client ID. The ESP32 logged that the session was absent, received a QoS 1 subscription acknowledgment, and logged the next browser test message with the matching ID and payload.

- Physical power cycling passed. With USB unplugged and the board unpowered, Chromium published and received broker acknowledgment. After USB power returned, the serial log showed session resume without a new subscription and receipt of the matching ID and payload.

- Off-network live delivery passed. The PC ran Chromium and the localhost sender on a phone hotspot while the ESP32 stayed on home Wi-Fi. The browser showed broker acknowledgment and the ESP32 logged the matching ID and payload.

No printer was attached for verification.
