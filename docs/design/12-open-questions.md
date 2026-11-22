# Unresolved design details

The previous discussion established an overall architecture, not an executable protocol specification. The items below are **open design questions**, not implementation tasks or a prioritized work plan.

## Broker and identity provisioning

- Which managed MQTT provider is chosen: flespi, EMQX, or another suitable service? What are its present free-tier limits, per-message maximum, persistent-session guarantees, WSS endpoint, retained-message storage, admin API, and ACL syntax?
- How are device and web credentials provisioned, rotated, and individually revoked? Does one shared web credential per owner remain acceptable once browser revocation matters?
- Exactly which identities may read/write each MQTT control-plane topic? Can the broker enforce recipient and sender topic constraints with a default-deny ACL?
- How does the protected membership directory bind owner IDs to printer public keys, how is it versioned, and how are removed members handled?

## Wire protocol and delivery

- Are image jobs sent as one MQTT publication or as application-level chunks? What is the maximum encoded print length and broker packet size?
- What exact canonical binary envelope is signed, and where do key IDs, algorithm identifiers, nonces, authenticated metadata, dimension/stride, content hashes and versioning live?
- How are incomplete jobs, out-of-order or duplicate chunks, delivery receipts, retry windows and replay records handled?
- When exactly is a job considered accepted, printed, failed or permanently discarded? How should ambiguous USB errors and unexpected reboots affect reprint behavior?
- Which printer raster dimensions, bytes-per-row, bit order, feed commands, and long-print constraints are proven by the P21 USB code?

## Cryptography and directory consistency

- The example suite was P-256 ECDH + HKDF + AES-GCM for encryption and ECDSA P-256/SHA-256 for signatures. Is this the final interoperable suite? What exact byte encodings, key serializations, ECDSA signature representation and validation rules apply?
- How are recipients protected from stale or substituted public keys, and how are key/credential rotations represented?
- How should offline recipients fetch and validate the current authorized browser signing-key directory *before* verifying delayed jobs, especially after a key revocation?
- What is the policy for retaining duplicate IDs, timestamps, replay prevention, and signature validity when a key has been revoked since a job was published?

## Enrollment and recovery

- What is the precise pairing QR/link payload and how are single-use enrollment tokens tracked and expired across reboots?
- How does the browser obtain scoped MQTT credentials during re-enrollment without exposing permanent management privileges? Where are bootstrap credentials stored on the printer?
- How does an AP-connected phone move to the public HTTPS site if the AP itself does not provide internet, without losing the enrollment context?
- How is the local management UI authenticated independently of the AP Wi-Fi password, and how are sensitive HTTP operations protected?
- What are the exact AP start, idle, connected-client, station-failure and grace-period rules, especially when a phone auto-switches networks?

## Firmware, storage, and hardware

- Which exact ESP32-S3 SuperMini flash/PSRAM variants are used and what are the actual maximum compiled image size and runtime heap headroom?
- What partition table supports two OTA slots plus nonerasable identity/settings and a useful print queue on the smallest boards?
- Are local web assets embedded in firmware or independently downloadable? How are signed update checks/rollback and backward-compatible settings migrations expressed?
- Which P21 regulated rail will power the ESP32 permanently, and what is its current capacity and behavior under printing, charging, and power-off conditions?
- Does the existing P21 power switch actually reboot the ESP32 when activated? If not, what noninvasive recovery signal is available?

## UX details

- What exactly appears in the public composer, preview, delivery status, failed-send feedback and setup experience?
- Is a current DHCP IP address printed only during provisioning, available on demand, or both? How are mDNS failures explained?
- How do member blocklists interact with pending broker-queued messages and senders who later become blocked?
- Is there any lightweight reaction or print acknowledgment feature worth having without physical extra controls?

These questions are intentionally left open for later detailed design. They should not be mistaken for omissions from an otherwise frozen specification.
