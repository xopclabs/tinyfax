# Design

## Context

The [broker qualification results](../qualify-managed-mqtt-broker/results.md) cover Chromium over WSS and a generic receiver over TLS. The ESP32 path still needs verification on hardware.

## Goals / Non-Goals

Prove live delivery and distinguish recovery after a network interruption, a reboot, and a missing session. Do not define the production job format or add an application receipt protocol.

## Decisions

- Use MQTT 5 and flespi Free. Manually provision a disposable publish-only browser credential and a disposable subscribe-only receiver credential scoped to the same test inbox. Enter the browser token at runtime without persisting it. Keep secrets out of Git and shared firmware builds.
- Serve the test page on localhost and run the browser on a different network from the ESP32. Verify broker TLS certificates on both clients. The page creates a fresh ID per send and displays it alongside the broker acknowledgment.
- Use the ESP32 attached to this PC over native USB. Linux detected the Espressif USB Serial/JTAG interface as `/dev/ttyACM0`. Identify the board and confirm a restore path before flashing. Use the existing ESP-IDF dev shell as the starting point for USB flashing and serial monitoring.
- Provision the receiver over USB serial using the PC's active Wi-Fi profile and the scoped receiver token. Pass credentials directly without echoing them or putting them in shell arguments, logs, or the firmware image. Store them in device NVS so startup needs no manual input. Confirm Wi-Fi connectivity, MQTT connectivity, and inbox readiness separately in the serial log.
- Keep the receiver client ID and connection settings stable across reboots. Request a nonzero session expiry and inspect Session Present on connection. Log the session outcome and check for subscription success when creating a new session.
- Run both offline checks after establishing the subscription and confirming the receiver is offline. Use a fresh client ID for the separate absent-session check rather than relying on a short expiry timer.

## Risks / Trade-offs

If the broker loses the session during either offline test, restoring the subscription recovers future delivery but does not pass that test. The results do not guarantee delivery after longer outages.
