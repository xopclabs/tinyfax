# Architecture decisions


## The physical printer is the receiving endpoint

The product is the paper itself. A printer therefore owns its USB link, message acceptance, permanent decryption identity and local owner controls. A browser is a sending tool and does not need an incoming inbox or access to the printer's private key. This keeps the recipient autonomous and avoids turning tinyfax into a conventional chat application. See [product](product.md) and [system boundaries](architecture.md).

## A managed MQTT broker is the only shared messaging service

Household routers generally do not allow arbitrary inbound peer connections without NAT traversal, relays or port configuration. MQTT lets both browsers and printer devices make outbound connections, and a broker can hold messages for established offline sessions. This removes the need for a custom always-on web API on the administrator's VPS. The broker remains a central dependency; the design is not a peer-to-peer mesh. See [MQTT](mqtt.md).

## The browser sends directly to the recipient

Requiring every outgoing print to pass through the sender's ESP32 would make sending depend on that printer being powered on, and complicate sending away from home. The public web application publishes directly to the destination printer's MQTT inbox. Sender-side ESP32 spooling is therefore not part of the normal path. Offline queueing falls to the broker within its limits. See [system boundaries](architecture.md) and [MQTT](mqtt.md).

## Static hosting carries the sending UI

Static HTTPS hosting makes the browser interface reachable outside the sender's LAN without a creator-operated application service. MQTT handles connection authentication; the browser itself renders and encrypts printable data. The ESP32's HTTP service has a separate job: local configuration and recovery when the internet or home Wi-Fi is unavailable. See [browser](browser.md) and [device management](device-management.md).

## Key authority stays with the receiving printer

Only the recipient printer needs the private key that decrypts its prints. Each sender browser gets its own signing key, making sender authentication possible without powering the sender's printer. Registration of those signing keys is approved by the owner's printer. MQTT login alone does not let a compromised browser approve a new replacement key after revocation. See [identity](identity.md) and [enrollment](enrollment.md).

## Permanent identity is outside firmware update slots

A firmware update must not destroy the decryption key or broker identity: doing so could make already queued ciphertext unreadable and require administrator reprovisioning. The firmware therefore uses separately preserved identity/settings storage and application A/B slots. Exact partition sizes follow measured firmware size, not a guessed board specification. See [flash and OTA](firmware-and-storage.md).

## Low-cost P21 USB hardware is the baseline

The PeriPage P21 is driven from the ESP32-S3 over USB, with a USB keepalive mechanism. Cheap ESP32-S3 boards are preferred over higher-priced boards where the necessary features fit. Zigbee and Bluetooth are not required for the product's normal print path. See [hardware](hardware.md) and the [dated hardware report](../status/2026-11-21.md).
