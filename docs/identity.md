# Identity and cryptography

The algorithm examples are candidates; no interoperable wire encoding has been specified.

## Identities

The system distinguishes a member (`bob`), the member's printer (MQTT device identity), and each browser authorized to send as that member (browser MQTT identity plus registered signing key). Display names are metadata, not proof of identity.

Each printer owns an encryption key pair. Its private decryption key is generated and retained on the ESP32; its public encryption key is published in a protected directory. Each enrolled browser owns an independent signing key pair; its private signing key stays in that browser, and the printer approves publication of the corresponding public verification key. A browser does not receive the printer's decryption key. A printer only needs signing capability if a later feature requires it to originate signed user messages.

This separation means Bob can send to Alice when Bob's printer is offline. Bob's browser encrypts to **Alice's printer public key**, then signs as Bob using **Bob's browser private signing key**.

## Example message security flow

```text
Bob's browser:
    raster = encode_print_job(content)
    recipient_key = trusted_encryption_key("alice")
    encrypted = encrypt_for(recipient_key, raster)
    envelope = bind(sender="bob", recipient="alice", id, crypto_fields, encrypted)
    signature = sign(bob_browser_private_key, encoded_envelope)
    publish(envelope, signature)

Alice's ESP32:
    assert key_id belongs to an approved Bob browser
    assert verify(bob_browser_public_key, encoded_envelope, signature)
    assert recipient == "alice"; check ID/replay/limits
    raster = decrypt(alice_printer_private_key, encrypted)
    accept for printing
```

`encode_print_job`, `encrypt_for` and `encoded_envelope` are conceptual operations; they are **not** APIs already implemented. Cryptographic verification requires a canonical, exact byte sequence shared by JavaScript and ESP-IDF. Sign the sender, recipient, message ID, version, algorithm identifiers, encryption parameters and ciphertext together, with a domain separator and key IDs. The signature must not be computed over JSON with unspecified serialization behavior.

## Cryptography candidates

- Recipient encryption: ephemeral P-256 ECDH, HKDF and AES-GCM (authenticated encryption); the exact key derivation info, AAD, nonce rules, key serialization and ephemeral-key handling are undecided.
- Sender signatures: ECDSA P-256 with SHA-256; the exact signature encoding is undecided. Browser Web Crypto commonly emits fixed-width `r || s`, while ESP-side verification libraries may accept DER, so interop needs an explicit representation.
- Browser private signing keys: generate as non-extractable `CryptoKey` objects, stored in IndexedDB. Non-extractability prevents normal raw export but not a compromised page asking the browser to sign.
- MQTT credentials: authenticate connections and authorize topics. They do not encrypt print content end-to-end.

Use maintained cryptographic libraries; do not implement elliptic-curve primitives manually. Cryptographic randomness, replay protection, key-rotation behavior and acceptance of old signatures must be specified before claiming production security.

## Trust boundaries

The MQTT broker sees topic names, traffic patterns, client identities and public metadata. With properly implemented E2EE and an authentic recipient public key, it cannot read raster plaintext. It may still drop, delay or replay ciphertext within protocol constraints.

A signature proves possession of a private signing key, not that the claimed human typed a particular message. The system accepts it as Bob only if the corresponding public key is registered as belonging to Bob by the authorized authority. That authority is **Bob's printer**, through the enrollment process in [enrollment](enrollment.md). Broker ACLs protect those registration topics. The broker administrator remains trusted not to substitute directory keys or alter authorization.

The administrator also controls the public website and firmware release channel. A malicious website version could capture plaintext before encryption or misuse a browser signing key; a malicious device update could export decrypted content or device keys. The design offers message confidentiality from the honest broker's message storage, not independence from the software maintainer. This is a private network with a trusted administrator, not a trustless federation.

Device keys in ordinary NVS persist across OTA but are not thereby protected from physical flash extraction. See [flash and OTA](firmware-and-storage.md) for storage rules.
