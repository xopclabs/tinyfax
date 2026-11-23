# Proposal

## Why

The bench sender proves secure job acceptance but can only send a fixed raster to one recipient. A usable sender needs recipient selection and composition before printer work starts.

## What Changes

- Add a static, localhost-served composer for text, one image, or both, with an exact monochrome raster preview.
- Restore the manually provisioned sender identity and list recipients with usable directory encryption keys.
- Set a measured bench payload cap and verify accepted raster hashes on the ESP32.

## Capabilities

### New Capabilities

- `browser-sender`: Local static composition, preview, and secure sending.

### Modified Capabilities

## Impact

Changes browser assets and the ESP32 secure receiver's bench limits. Public hosting, enrollment, and printing are out of scope.
