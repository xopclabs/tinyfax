# Design decisions and boundaries

## Product intent — agreed

**tinyfax** is a playful, private network of real thermal printers. Sending something should cause actual paper to emerge at another person's home. Ordinary chatting, history, and reactions already have better platforms (WhatsApp, etc.); tinyfax is not meant to become another general messaging app.

The essential experience is:

- A friend receives a printer and configures home Wi-Fi without a computer, router changes, or firmware flashing.
- They use a browser to send text or a picture to an authorized recipient.
- The recipient's autonomous printer prints it, without an open browser or a laptop/Raspberry Pi running nearby.
- Sending works when the sender is away from home and even when the sender's own printer is offline.
- A recipient may be offline temporarily; queued delivery is desirable where the chosen broker supports it.
- Adding another gift printer should not require redeploying every existing device or client.

## Agreed architectural direction

| Concern | Direction | Qualification |
|---|---|---|
| Embedded node | In-printer ESP32-S3, preferably inexpensive SuperMini hardware | Exact flash configuration/partition capacity still needs validation |
| Physical print transport | **USB to PeriPage P21** | This supersedes the earlier BLE plan; USB printing and keepalive have now been tested |
| Communication between households | Managed MQTT broker over the internet | Provider not finalized; no self-hosted VPS dependency |
| Sender application | Public static website that connects directly to MQTT over WSS | Hosting could be GitHub Pages or similar; not a proprietary backend |
| Web access | Usable away from home | The LAN-only assumption from early exploration was explicitly reversed |
| Printer-side web interface | Local administration and recovery via AP; mDNS on home LAN | Composition UI locally is optional, not central to the final design |
| Sender's printer | Not involved in normal sending from the website | Browser publishes directly to the recipient's inbox |
| Receiver | ESP32 verifies/decrypts a job, persists as appropriate, and prints | Precise job protocol and acknowledgment semantics remain open |
| Privacy | Recipient printer has encryption key pair; sender browser has signing key pair | Cryptographic construction discussed; wire format not frozen |
| Browser authentication | Scoped MQTT credentials, imported during enrollment | MQTT connection is the public site's login; no separate account server |
| Browser key authorization | Printer approves new browser signing keys using one-time pairing | Replaces earlier idea that browsers could self-authorize authoritative keys |
| Membership | Creator provisions a new member/device identity | Existing members discover it from a protected MQTT directory |
| Recovery | Temporary setup AP on boot; persistent recovery AP when home Wi-Fi fails | No new holes, buttons, or display required |
| OTA | A/B firmware OTA from trusted release hosting, triggered through MQTT or periodic checks | Permanent identity/storage partitions never overwritten by normal OTA |
| Broker failover | **Explicitly skipped** | Single managed broker is sufficient initially |

## Privacy and trust model

The design intentionally prioritizes convenience for a small group rather than proving independence from the creator. TLS protects transport to the broker; application-layer encryption protects the print contents from the broker if keys and software are trusted. Browser signatures distinguish authorized sending browsers.

This does **not** mean the system is trustless. The creator provisions MQTT accounts and can maintain the static site's JavaScript and firmware releases. Public-key-directory administration and update distribution remain meaningful trust points. The friends were not assumed to require independently audited, owner-controlled cryptographic infrastructure.

## Operational constraints

- Little to no technical intervention should be required from gift recipients.
- No router port forwarding, inbound public IP, WireGuard, home server, or custom DNS.
- No permanent maintenance burden on the creator's VPS.
- Keep hardware cheap; 4 MB S3 boards without PSRAM are plausible but space constrained.
- Printer and ESP32 are intended to be a **plugged-in appliance**, though battery-backed behavior may be possible.
- Avoid physical modifications requiring drilling a case for buttons or screens.
- Normal reconfiguration must preserve the long-lived printer identity and all installed encryption keys.

## Deliberate non-goals

- Open, unpermissioned peer discovery or a public social network.
- Replacing phone-to-phone messaging or displaying message histories on phones.
- Direct P2P NAT traversal, torrent-like DHT discovery, or broker failover for the initial private network.
- A compulsory central application API/database operated on a personal VPS.
- Sending images over Zigbee in the initial implementation.
- Building a replacement printer PCB or adding a physical display/control cluster before the gifts.

## Important unresolved boundaries

Exact MQTT broker, quota, ACL expressiveness, topic format, binary message encoding, maximum job length, chunking strategy, offline retention, signed update policy, browser credential distribution, and filesystem/partition sizing were **not** finalized. They are recorded as unresolved rather than quietly invented.
