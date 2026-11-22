# Current project state — latest reported hardware progress

**Status timestamp:** reported in the conversation on **2026-11-21** (documentation assembled on 2026-11-22).

This document records **reported facts**, not intended architecture. Everything not explicitly marked as tested below should be treated as a design proposal until verified.

## Verified / completed

- The target printer is a **PeriPage P21**.
- **Printing the P21 from code over USB works.** This is the major change from the older, BLE-focused approach.
- A **USB keepalive** technique has been implemented and tested; it can prevent the printer from entering sleep state.
- An **ESP32-S3** has been purchased.
- On the P21 board, the relevant **GND, regulated 3.3 V, USB D− and USB D+** connection points have been identified.
- A **breadboard prototype has successfully printed from the ESP32-S3 to the P21**, using the identified interface.

These observations make USB-based integration a demonstrated starting point, not merely a theoretical possibility.

## Hardware integration still pending in the latest report

- A **male USB-C breakout** had been ordered and was **awaiting arrival**.
- The intended purpose is to solder the P21 pads to the breakout for a more permanent physical printer/ESP32 connection.
- Final inside-the-enclosure assembly, power stability over time, recovery with the real power switch, and charger/battery behavior were **not reported as fully tested**.

## Software status

- The original proof of concept was a cheap cat printer driven by code from an **old laptop** acting as an always-on server, including a keepalive and an API for text/image printing. The API was exposed through a **public VPS** for friends to send messages; that experiment was fun but did not provide autonomous printers for recipients.
- The most recent confirmed work is **USB print control and keepalive, including ESP32-S3 breadboard printing**.
- There is **no reported completed implementation** of the new tinyfax MQTT network, public static browser application, client key enrollment, end-to-end encrypted/signed message format, management AP, persistent key directory, receipt semantics, or signed dual-slot OTA system.
- No managed MQTT provider is reported as selected/configured, and no deployment of the redesigned web frontend is reported.

This is not a claim that none of those things exist outside the conversation; it is the boundary of what was actually reported.

## Confirmed direction as of this report

The software work can proceed independently from final soldering because the essential hardware transport has already been proven. The discussed design is a self-contained ESP32-S3 + P21 USB appliance, joined to a small invitation-only network through a managed MQTT broker and static browser client. The browser can publish signed/encrypted jobs directly to the recipient printer. Recovery and administration happen locally, and OTA preserves permanent device keys and credentials.

## Historical evolution to keep straight

1. Laptop server with BLE and a forwarded VPS API demonstrated social interest in paper messages.
2. Initial firmware/network conversation focused on BLE printer control, Wi-Fi + MQTT and cheap ESP32 boards, with possible Zigbee on C6.
3. The security/onboarding design matured into **printer-held decryption keys + browser-held signing keys + printer-approved browser enrollment**.
4. Hardware experiments later established **USB P21 printing and USB keepalive**, replacing BLE as the preferred device-to-printer link.

The architecture documents describe the *intended* result of these discussions; they should not be read as a description of already deployed software.
