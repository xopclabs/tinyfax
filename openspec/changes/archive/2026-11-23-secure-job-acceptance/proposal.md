# Proposal

## Why

The paper-free MQTT path proves device receipt. This change proves that the ESP32 accepts only authorized, valid print jobs before a composer or printer is attached.

## What Changes

- Send a signed, encrypted monochrome raster fixture from the browser to a paper-free test sink.
- Prove interoperability with locally exchanged public keys, then repeat the send using retained membership and public-key records.
- Reject expired and duplicate jobs, including after reboot, without persisting the raster.

## Capabilities

### New Capabilities

- `secure-print-jobs`: Authenticated encryption, authorization, and replay checks for print job acceptance.

### Modified Capabilities

## Impact

Extends the browser test page, ESP32 firmware, and flespi test configuration. Enrollment, composition, printing, and a durable print queue are out of scope.
