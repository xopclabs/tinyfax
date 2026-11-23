# Bench job envelope v1

A job is one non-retained MQTT publication at QoS 1. Integers are unsigned and big-endian. Member IDs, key IDs and job IDs are 16 raw bytes each. Public P-256 keys use 65-byte uncompressed SEC1 encoding. Reject unknown versions, invalid curve points, incorrect lengths and trailing bytes.

| Field | Bytes |
| --- | ---: |
| Magic `TFJ` and version `01` | 4 |
| Sender member ID | 16 |
| Recipient member ID | 16 |
| Browser signing key ID | 16 |
| Receiver encryption key ID | 16 |
| Job ID | 16 |
| Issued at and expires at, Unix seconds | 4 each |
| Ephemeral ECDH public key | 65 |
| AES-GCM nonce | 12 |
| Ciphertext length, excluding the tag | 2 |
| Ciphertext | As declared |
| AES-GCM tag | 16 |
| ECDSA signature, fixed-width `r || s` | 64 |

The header is the first 171 bytes, through ciphertext length. Generate a new ephemeral P-256 key and a fresh random nonce for each job. Derive a 32-byte AES key with HKDF-SHA-256 using the 32-byte ECDH shared secret, the nonce as salt, and ASCII `tinyfax/bench-job/v1/aes-gcm` as info. Use the entire header as AES-GCM additional authenticated data. Sign ASCII `tinyfax/bench-job/v1/sign` followed by the header, ciphertext and tag with ECDSA P-256/SHA-256. The receiver authorizes the signer and verifies the signature before decryption.

The plaintext starts with a two-byte width and a two-byte height. Rows are packed most significant bit first, with zero padding at the end of each row. The receiver requires nonzero dimensions and exactly `4 + ceil(width / 8) * height` plaintext bytes. The bench fixture is 8 by 8 pixels with row bytes `81 42 24 18 18 24 42 81`. The bench caps plaintext at 512 bytes including dimensions, for a maximum publication of 763 bytes. This is a tested bound, not a measurement of the board's maximum capacity.

Expiry is exactly 600 seconds after issuance. The receiver rejects expired jobs and expiry more than 600 seconds ahead of its synchronized clock. Duplicate identity is the sender member ID and job ID.
