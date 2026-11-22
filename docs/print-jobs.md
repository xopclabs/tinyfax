# Print jobs and delivery semantics


## Job contents

A print job needs a unique ID, sender and recipient identifiers, the intended output dimensions or equivalent raster metadata, and a printable payload. Its authenticated envelope also carries the cryptographic fields described in [identity](identity.md). A textual message is rendered into printer raster data by the browser; the ESP32 need not implement a general font layout engine.

The sending browser is responsible for scaling, text layout, monochrome conversion, dithering and preview. The ESP32 is responsible for validating the incoming job and converting its raster representation into the P21's USB command stream. The renderer's output and the native P21 wire commands are distinct formats.

## Pixel budget

The working assumption from the design discussion is a 384-pixel-wide, one-bit-per-pixel raster. The **actual** printable P21 width, packing order and row direction must be established from the tested USB printing code; 384 is not a hardware specification proven by this documentation.

For a tightly packed 384-pixel row, width is 48 bytes:

```text
bytes_per_row = ceil(width_px / 8)
bytes_total   = bytes_per_row * height_px
```

| Height | Packed size at 384 px |
| ---: | ---: |
| 500 rows | 24,000 bytes |
| 1,000 rows | 48,000 bytes |
| 2,000 rows | 96,000 bytes |
| 5,000 rows | 240,000 bytes |

Printable height is not truly unbounded: the broker message limit, flash capacity, battery/thermal behavior and print length policy must impose finite limits. Long images should not require whole-image allocation in ESP32 internal RAM.

## MQTT payload options

**One MQTT publication per job.** MQTT and TCP transfer a large logical publication across multiple network reads. Some ESP-MQTT receive paths deliver data incrementally to callbacks, allowing direct writes to flash. This does not imply that the sender's MQTT API can stream a filesystem job without materializing a large outgoing payload; broker maximum-message size and client buffers still matter.

**Application-level chunks.** Publish bounded pieces with a job ID and chunk index, assemble to storage, check complete length/hash, then print. This avoids large single MQTT packets but requires duplicate/out-of-order handling, missing-chunk expiry and bounded partial-job cleanup. A repeated chunk must not produce an extra print.

These are alternatives under consideration, not two simultaneously required protocols. The browser can prepare a common raster representation regardless of how the transport divides it.

## Receipt and retry semantics

The receiver must distinguish the following events internally, even if the public UI presents fewer states:

- Publication accepted by the broker: a MQTT-level result, not a receiver result.
- Job verified and safely accepted by the ESP32: an application-level receiver result, if implemented.
- USB print attempted/submitted: the ESP32 sent data to the P21, not necessarily proof of paper output.
- Job failed or rejected: may include invalid signature, expired job, blocked sender, storage exhaustion or printer failure.

QoS 1 admits duplicates. Physical printing is not a transactional operation: a power loss after issuing USB print data but before recording completion can leave an ambiguous result. Do not claim exactly-once paper output. Persist job IDs and transitions consistently, define how a reboot handles an ambiguous job, and decide whether to favor reprint or avoid duplicates.

The printer-side blocklist is defined in [device management](device-management.md). Signature, authenticity and replay checks are defined in [identity](identity.md).
