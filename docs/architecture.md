# System boundaries


```text
 Sender browser                            Recipient household
 ┌────────────────────┐                     ┌──────────────────────┐
 │ Public static site │                     │ ESP32-S3             │
 │ text/image → raster│                     │ MQTT client          │
 │ encrypt + sign     │                     │ verify + decrypt     │
 └─────────┬──────────┘                     │ queue + USB driver   │
           │ MQTT over WSS                 └───────────┬──────────┘
           ▼                                            │ USB
 ┌──────────────────────┐          MQTT over TLS         ▼
 │ Managed MQTT broker  │─────────────────────────► PeriPage P21
 │ ACLs, subscriptions  │
 │ optional offline queue│
 └──────────────────────┘

 Local setup browser ──HTTP over LAN/SoftAP──► recipient ESP32-S3
```

## Component responsibilities

| Component | Owns | Does not own |
| --- | --- | --- |
| Public static sender website | Composition, preview, text/image rasterization, browser credential storage, message encryption and signatures, MQTT/WSS submission | A backend database, incoming plaintext inbox, device printing, a permanent delivery queue |
| Managed MQTT broker | Connection authentication, per-topic authorization, routing, retained directory/key data, configured offline session queues | Decrypting prints, determining physical print success, signing on behalf of members |
| Printer ESP32-S3 | Permanent device identity, approved browser keys, incoming validation and decryption, local print state, USB P21 communication and keepalive, setup/recovery, update client | Signing messages on behalf of an offline sender browser, serving an internet-accessible API |
| Local configuration UI | Wi-Fi, owner-controlled browser enrollment/revocation, blocklists, diagnostics, updates | Normal internet-facing sending endpoint |
| Network administrator | Initial member credentials, broker policy, membership records, firmware release authority | Per-message approval, browser key approval for existing members |

## Normal message path

1. The sender opens the static HTTPS site. It restores that browser's MQTT credentials and private signing key.
2. The site obtains the recipient's public encryption key and the network's recipient information from protected MQTT records.
3. It renders the chosen content into printer-oriented monochrome data, encrypts the job to the recipient printer, and signs the message envelope with the browser's private signing key.
4. It publishes the job directly to the recipient's inbox topic. The sender's printer is not part of this path.
5. The recipient ESP32 receives the job, confirms the claimed identity against the authorized browser key directory, checks the signature and message validity, decrypts, and handles deduplication and its local print queue.
6. The ESP32 streams the data to the P21 over USB. Any delivery or print status is an application message separate from MQTT transport acknowledgments.

The exact validation order, persistence checkpoint and envelope encoding are not fixed yet; their constraints live in [identity](identity.md) and [print jobs](print-jobs.md).

## Control-plane paths

The printer publishes its public encryption key and the browser signing keys it has approved. The administrator publishes or authorizes network membership. These records are retained on MQTT with restricted write permissions. Printer Wi-Fi recovery is local; admin MQTT commands are usable only while the device is connected.

The local web service uses the ESP32's assigned DHCP address and may advertise an mDNS hostname, such as `tinyfax-bob.local`. A special DNS server and reserved IP are not required, but mDNS can be blocked by client or network behavior. The setup AP remains the independent fallback; see [device management](device-management.md).
