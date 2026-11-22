# Identity, authentication, encryption, and signatures

## Separate identities and separate key roles

The design has four different concepts:

1. **Member identity:** an owner such as `bob` or `alice`, with a human-readable preferred name.
2. **MQTT identity:** credentials for the owner's printer, and separate scoped credentials for their browser(s). The broker authenticates connections and enforces topic ACLs.
3. **Printer encryption key pair:** created on the ESP32, with its private key kept on the printer. Senders encrypt for the **recipient's printer** public key.
4. **Browser signing key pair:** created by each enrolled browser, private key kept in that browser, public key registered as approved by the owner's printer. Senders sign using **their own browser** private keys.

No phone ever needs to decrypt received paper messages, because viewing incoming messages on the phone is explicitly *not a product goal*. A browser therefore needs a signing pair, not its owner's printer decryption key. Each printer needs an encryption pair, but does not need a signing pair unless later features require it to originate signed application messages.

| Participant/device | Private encryption key | Private signing key |
|---|---|---|
| Alice's P21/ESP32 | Yes | Not required for ordinary incoming prints |
| Alice's phone browser | No | Yes (its own) |
| Bob's laptop browser | No | Yes (different from Bob's phone) |
| Bob's P21/ESP32 | Yes | Not required for ordinary incoming prints |

**Do not copy the printer's decryption private key into the browser.** Earlier discussion considered shared key export/localStorage but rejected it in favor of different keys per device and purpose.

## Why both encryption and signing exist

**Encryption** answers: *Who can read the contents?* When Bob sends Alice a picture, he encrypts for Alice's printer public key; only the corresponding private key can decrypt it.

**A signature** answers: *Which approved private signing key produced this exact message?* Bob's browser signs the encrypted envelope; Alice's printer checks the signature against an approved public browser key registered under Bob.

They are independent. Encrypting for Alice **does not prove Bob sent it**. A valid Bob signature also does not hide the message; the encryption layer does that. The broker's topic ACL can provide account-level sender attribution, but a signature gives the printer a cryptographic check that the sender possessed an authorized signing key.

## Example: Bob sends Alice a photo

1. Bob's enrolled browser looks up **Alice's printer encryption public key** and identifies its own **Bob-browser signing private key**.
2. It converts the image to a print bitmap.
3. It creates an ephemeral key agreement, derives a symmetric encryption key, and encrypts the bitmap for Alice's printer (an example construction discussed: **ephemeral P-256 ECDH + HKDF + AES-GCM**).
4. It creates a message envelope containing sender, recipient, unique ID, algorithm and key IDs, ephemeral public key, nonce, and ciphertext.
5. It signs the exact defined envelope bytes with its browser signing key (example: **ECDSA P-256 with SHA-256**). The signature field itself is excluded from the signed bytes.
6. MQTT transports the envelope. The broker sees routing metadata and ciphertext, but not the print contents, assuming genuine keys and uncompromised endpoints.
7. Alice's ESP32 finds Bob's authorized public signing key, verifies the signature, verifies envelope/recipient/replay conditions, decrypts using **Alice's printer private key**, and prints the result.

Bob's printer is not part of this flow. It may be switched off or disconnected.

## What a signature looks like

A signature is a byte string produced by a standard asymmetric signing algorithm from the **exact message bytes** and a private signing key. A verifier supplies those same bytes, the signature, and the corresponding public key. Verification returns valid or invalid. Modifying the ciphertext, sender, recipient, or other signed metadata makes the original signature invalid.

ECDSA does *not* simply encrypt a message hash. It computes an elliptic-curve signature conventionally represented as the pair `(r, s)`. Web Crypto and Mbed TLS may represent that pair differently (fixed-width `r || s` versus ASN.1 DER). Wire encoding and conversion must be specified if this algorithm is selected.

The signature is meaningful as a **Bob** signature only if the *public key itself* was approved as one of Bob's authorized browser keys. Merely publishing a JSON record with `name: "bob"` proves nothing.

## Trust in the key directory

The protected MQTT directory serves as the application's public-key registry:

- The printer publishes its public encryption key as part of its authenticated identity.
- The printer, not a browser, publishes or revokes **authoritative approved browser signing keys** for its owner.
- Readers must trust those bindings to the owner identity and reject unauthenticated replacements.
- The creator provisions member/device identities and broker ACLs.

This supports self-service browser enrollment after the printer has been gifted. It does not defend against a malicious provider/administrator who can replace the directory, or against the creator deliberately shipping malicious JavaScript or firmware. Full owner-verifiable key transparency is outside the agreed scope.

## Storage and key lifecycle

- Printer decryption private key is generated once and preserved in non-OTA identity storage.
- Device MQTT credentials are likewise permanent across normal restarts, Wi-Fi changes, and application OTA.
- Browser signing key is generated once per browser enrollment. An ideal browser implementation uses a **non-extractable Web Crypto `CryptoKey`** in IndexedDB rather than raw key material in `localStorage`.
- Browser MQTT credentials are separate from printer MQTT credentials; the browser stores them locally after enrollment.
- A new phone gets **a new browser signing key pair** and is approved by the printer. It never needs the old phone's signing private key.
- Revocation removes a key from the printer-authorized directory. Receiving devices must apply revocations, including after being offline.
- If the printer loses its decryption private key, queued encrypted messages for that key may become unreadable. An NVS read error must not silently generate a replacement key.

Non-extractable browser keys do not prevent malicious JavaScript served from the same website from requesting signatures; static site and firmware distribution remain part of the practical trust model.

## Privacy boundaries and metadata

TLS encrypts the connection to the broker. Application encryption, if implemented correctly with authenticated recipient keys, keeps printable contents private from the broker, but not from the receiving ESP32. MQTT topics, credentials, routing, timing, sizes, membership records, and presence can still reveal metadata.

Signed and encrypted messages should also authenticate the intended recipient, protocol version, key IDs, and unique message ID, not only the bitmap. Replay protection, precise encoding, nonce uniqueness, algorithm negotiation and rotation are **open protocol details**.
