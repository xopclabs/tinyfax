# Proposal

## Why

Verify browser-to-ESP32 messaging on the target hardware before adding secure jobs or printing.

## What Changes

- Add a local browser test sender and an ESP32 receiver using flespi Free.
- Verify live delivery, session resume after Wi-Fi interruption and power cycling, and recovery when no session remains.
- Exclude public hosting, composition, printing, application encryption, and enrollment.

## Capabilities

### New Capabilities

- `mqtt-job-transport`: Browser-to-device MQTT delivery and receiver session recovery.

### Modified Capabilities

## Impact

Adds a test page, ESP32-S3 firmware, and hardware verification using disposable, scoped credentials. The overnight broker test is not a prerequisite.
