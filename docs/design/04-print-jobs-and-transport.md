# Print jobs, images, and delivery

## What a print job is

A job is a physical output request, not a chat message. It has at least a unique ID, claimed sender, recipient, a monochrome printable payload, and enough metadata for the recipient to validate, decrypt, deduplicate, and render/print it. The wire format was **not** finalized.

A print-oriented design avoids building a general messaging inbox or chat history. The browser is the composing tool; the printer is the output and durable identity endpoint.

## Raster representation

The discussed print format is **approximately 384 pixels wide at 1 bit per pixel**. The exact PeriPage P21 printable width, row order, byte order, thermal head protocol, and supported feed semantics must come from tested printer code, not from this design assumption.

For a packed 384-pixel-wide raster:

```text
bytes_per_row = 384 / 8 = 48
uncompressed_bytes = 48 * height_pixels
```

| Bitmap height | Approximate bitmap size |
|---:|---:|
| 500 px | 24,000 B |
| 1,000 px | 48,000 B |
| 2,000 px | 96,000 B |
| 5,000 px | 240,000 B |
| 10,000 px | 480,000 B |

Compression could help, but is optional and not specified. Arbitrarily tall images cannot be supported without finite resource limits: maximum job length, queue capacity, and printing time need bounds. A previously discussed 256–512 KB limit was an **example**, not a chosen product limit.

## Where processing happens

The preferred browser model prepares the printable raster before transmission: resize, crop/layout, dither to monochrome, and encode a compact representation. That keeps the ESP32's memory and CPU requirements manageable.

Text can be rendered as a bitmap too, permitting custom type, graphics, headers, or stickers. There is no requirement to depend on the P21's built-in font rendering.

The receiver should process a verified job in bounded memory; it does not need to load a long bitmap into RAM. Flash storage is safer than RAM for a job that must survive reboot. The current architecture does not require the *sender's* ESP32 to buffer outgoing jobs: browser publication goes straight to the broker.

## Two discussed MQTT publication strategies

### A. One MQTT PUBLISH per job

The browser publishes one logical MQTT message containing the full encrypted print job. TCP will transmit it in multiple network segments; MQTT still sees **one** publication. An ESP-IDF MQTT client can deliver the received payload through multiple callback events/offsets while a file is written incrementally.

Advantages: simple application-level message boundaries, only one broker message and QoS handshake. Constraints: broker maximum packet size, publisher buffer behavior, any library buffering requirements, and the receiver's ability to stream securely to flash. ESP-MQTT's common outgoing publish API expects a complete payload pointer; streaming a flash file as a single publication is a different issue from fragmented receive callbacks. Browser senders may have more RAM than the printer, but provider limits still apply.

### B. Chunk a job into multiple MQTT PUBLISH messages

The client splits the job into bounded chunks, for example 4–8 KB as an *illustrative* size. Each chunk is separately published with a job ID and index; the recipient reassembles the job in flash and validates it before printing.

Advantages: bounded packet sizes and memory; potential selective retransmission. Constraints: explicit manifest, chunk count/lengths, duplicate handling, out-of-order arrival, abandoned partial jobs, integrity checking, timeouts, and broker queue overhead.

For cryptographic integrity, the receiver must not print unverified partial ciphertext. A design can sign/encrypt a whole envelope before chunking, or define authenticated chunks with a signed manifest; that choice has not been made.

**Status:** neither A nor B is final. No protocol field names, chunk size, compression, or maximum job size were approved.

## Delivery stages

There are at least three different events:

1. **Broker accepted:** MQTT QoS 1 publication acknowledged to the browser. This does not prove delivery to the ESP32.
2. **Device accepted:** recipient ESP32 has received, authenticated, and durably stored a complete job. This would require a separate application-level receipt.
3. **Print submitted:** recipient ESP32 has transmitted the job to the P21 over USB. Without printer-provided physical feedback, this is not proof that a person saw paper or that the paper feed succeeded.

A print acknowledgment, delivery receipt, or sender-visible status UI was discussed as potentially useful, motivated by the original problem of not seeing reactions. Actual reaction behavior and UX were **not settled**; no added physical button is planned for v1.

## Duplicate and replay behavior

QoS 1 is *at least once*; jobs may be delivered again after reconnects and retries. Use application-level unique IDs and persistent processed/completed ID records. There remains an unavoidable failure window: a reset after paper emerges but before the completion record is durably stored may cause a duplicate physical print. Perfect exactly-once printing is not promised.

Cryptographic signatures authenticate origin and integrity but do not by themselves prevent replay of an old valid signed job. The device needs deduplication and a bounded replay policy, including what happens after old ID records expire.

## Envelope sketch — illustrative only

```json
{
  "version": 1,
  "id": "unique-message-id",
  "from": "bob",
  "to": "alice",
  "signingKeyId": "bob-browser-1",
  "encryption": {
    "algorithm": "P256-HKDF-AESGCM",
    "recipientKeyId": "alice-printer-key-1",
    "ephemeralPublicKey": "...",
    "nonce": "..."
  },
  "ciphertext": "binary-or-encoded-data",
  "signature": "..."
}
```

This is a *concept*, not a suggestion to put large binary bitmaps into JSON/base64; a framed binary envelope may be preferable. An actual protocol must define precisely which bytes are signed, canonical field encoding, sizes, crypto parameters, authenticated metadata, and versioning. See [Identity and cryptography](05-identity-and-cryptography.md).
