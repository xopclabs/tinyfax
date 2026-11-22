# Alternatives considered and why the direction changed

This is a rationale record. It distinguishes discarded ideas from those that may still be optional extensions.

## Pure P2P internet routing

The original preference was to avoid any server. Direct inbound access between home networks is complicated by NAT and sometimes CGNAT; asking friends to configure routers or VPNs would undermine the appliance experience. WebRTC-style traversal would still introduce coordination and potentially relay infrastructure. Open P2P discovery/DHT/peer-managed routing was explored conceptually but is **not** the agreed private network.

## Creator-operated VPS and centralized API

The first prototype used a laptop print server with an API relayed via a public VPS. This worked for sending pictures but required constant creator-managed availability and didn't provide an autonomous printer for the sender to receive a reply. A centralized mailbox/HTTP API (for example a small serverless Worker + database) was considered. MQTT with a static public browser UI was preferred because it avoids maintaining a custom application backend.

A public static website is still a hosted dependency, but serving static files is not the same as operating a VPS backend. A managed broker is intentionally the shared infrastructure.

## Sender ESP32 as universal outbox

An earlier design sent browser jobs to the sender's ESP32 for durable flash buffering before retransmitting to the recipient. That is technically viable when the sender's ESP32 is reachable and online. The direction was corrected: **the public website can publish directly to the receiving printer's MQTT inbox.** This enables sending from anywhere even when the sender's ESP32 is offline. Broker offline queues may cover recipient disconnections. A sender-side outbox is therefore not fundamental to normal sending.

## Locally served full composer

The ESP32 can serve an HTTP UI on the LAN using mDNS (`*.local`), removing the static host dependency while at home. It was initially attractive for ease of setup. Later discussion prioritized sending from anywhere and browser-side MQTT, encryption, and signatures. The local UI remains useful for **device administration**, while a full local composer is optional. Serving cryptographic Web Crypto functionality over ordinary `http://*.local` also raises browser secure-context constraints.

## Telegram as transport

Using Telegram bots to deliver images without a custom backend was considered and **explicitly rejected**: recipients don't use it, and substituting a chat app defeats the unique appeal of printing rather than ordinary messaging.

## BLE printer control

The first approach involved BLE keepalive and print commands, possibly simulating the printer power button. Later practical work got **P21 USB printing and USB keepalive working** and demonstrated printing from an ESP32-S3. USB supersedes BLE as the print/keepalive path. The earlier suggestions about Classic Bluetooth support on different ESP32 variants are now background only.

## One physical button or display

A physical reaction button (single tap acknowledgement / heart) was proposed to make the medium bidirectional. The user was skeptical of a lone button without a display or several controls, and did not want to drill enclosure holes. **No added controls** is the current baseline. A software reaction/receipt concept might still be considered separately.

## Shared key versus per-browser keys

An idea to copy the printer private key into website localStorage was rejected. It would share a powerful decryption secret across devices and expand the consequences of browser compromise. The settled direction is distinct roles: printer private **decryption** key and independent per-browser private **signing** keys.

The first key-registration sketch allowed browsers to publish their own authoritative signing keys under an ACL-protected owner topic. This was refined because revoking a lost browser would not stop that browser from registering another key with still-valid shared MQTT credentials. The printer is therefore the authority for enrollment approval and key revocation.

## Broker lists, failover, and replication

A list of independent MQTT brokers can provide connection retries, but subscriptions, queues, credentials, and retained records are not automatically shared. Dual publishing/dual subscriptions would require duplicate suppression and additional failure semantics. Broker failover was discussed and **explicitly deferred**. Use a single managed broker for the private network.

## Zigbee

A C6-powered Zigbee printer was attractive as a personal experiment or Home Assistant endpoint. Zigbee is not the medium for full print images, especially while Wi-Fi/BLE coexistence and low-throughput radios add complexity. The gift units moved toward cheap S3 boards.
