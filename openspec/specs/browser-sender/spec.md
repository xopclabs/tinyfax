# browser-sender Specification

## Purpose

Compose and securely send a monochrome print job from a static browser page without requiring a printer for verification.

## Requirements

### Requirement: Restore a manually provisioned sender

The localhost sender SHALL restore the scoped broker credential and its own non-extractable signing key from the same browser profile. It SHALL list only directory members with usable public encryption keys.

#### Scenario: Return to the sender

- **WHEN** a manually provisioned browser reopens the page
- **THEN** it can select an eligible recipient and send without entering the credential again

### Requirement: Preview and send the same raster

The sender SHALL support text, one image, or both in one job, preview the exact monochrome raster it encodes, and prevent submission beyond the verified receiver cap. It SHALL report broker acknowledgment without implying device receipt or printing.

#### Scenario: Send each composition type

- **WHEN** a provisioned browser sends text-only, image-only, and combined jobs after reopening the page
- **THEN** the ESP32 accepts each authorized job and reports a raster hash matching the browser preview
