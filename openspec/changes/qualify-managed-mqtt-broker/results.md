# flespi smoke test, 2026-11-22

Two MQTT.js clients used separate scoped test tokens on the flespi account. The sender used MQTT 5 over WSS and the receiver used MQTT 5 over TLS. No browser, ESP32, or printer was involved.

- Both clients connected and delivered a QoS 1 test message while online.
- A QoS 1 message published with Retain off while the receiver was disconnected arrived after reconnect with the same client ID and a 600-second session expiry. The broker reported Session Present. The receiver did not subscribe again.
- A fresh sender session received the receiver's retained test key. The broker rejected the sender's attempts to replace that record and publish under another sender's topic with reason code 135. The retained value was unchanged and the receiver cleared it after the test.
- The broker granted the sender's subscription to the receiver's inbox at QoS 1, but the sender did not receive the test message delivered to the receiver. This check verified delivery filtering, not subscription rejection.

## Follow-up qualification

- Headless Chromium connected over WSS and received a QoS 1 publish acknowledgment. A loopback page loaded the MQTT.js browser bundle. The test did not use the hosted tinyfax UI.
- The browser-role token received successful QoS 1 subscription acknowledgments for `#`, `tinyfax-test/#`, and `tinyfax-test/inbox/+/from/+`. It did not receive the inbox test traffic that reached the authorized receiver.
- Two printer tokens could each write their own retained record. The broker rejected both printers' attempts to replace or delete the other printer's record with reason code 135. The test cleared both records and revoked the temporary second printer token.
- The receiver got exact 25,000-byte and 100,000-byte payloads, verified by SHA-256, while online and after 65 seconds offline. Offline delivery resumed the existing session without resubscribing.
- A separate client requested a three-second session expiry. The broker still reported Session Present after the client reconnected 11 seconds later. This does not establish the effective minimum expiry or when the broker discards queued jobs.

The tests did not cover the proposed 72-hour offline window, queue exhaustion, or provider restarts.
