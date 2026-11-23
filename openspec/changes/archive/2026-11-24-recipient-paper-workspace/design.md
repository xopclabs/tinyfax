# Design

## Context

The static sender already restores a browser identity, reads directory keys, and sends a preview-matched raster to the ESP32. The workspace changes selection and composition without changing the secure envelope or introducing a delivery receipt protocol.

## Goals / Non-Goals

Use the People and Paper layout with desktop as the main test surface and a narrow-screen workflow for single and multiple recipients. Exclude element editing, mixed content, counters, presence, public hosting, and printer administration.

## Decisions

- Keep selection as a set of stable member IDs. Desktop toggles rows. On narrow screens, a tap opens Paper for one person; long-press starts multi-selection, followed by an explicit action to open Paper. Show the selected names at Send.
- Use one active content mode with one preview. Reuse the verified raster cap and generate the preview from the packed bits. Scale images horizontally and proportionally to the canvas width. Reject output that exceeds the cap instead of cropping it.
- Snapshot the raster and selected recipients at Send. Reuse the scoped WSS connection where practical, but build an independently encrypted and signed job for each eligible recipient. Display acknowledged and unconfirmed outcomes by name in the same status area.
- Keep manual provisioning and public-key export in Settings. Keep bench diagnostics outside the normal sender views. Use static navigation that does not require a server router.

## Risks / Trade-offs

A single bench ESP32 cannot prove physical receipt at multiple printers. Verify fan-out with scoped test recipients and one real ESP32 acceptance check. An unconfirmed publication may have reached the broker, so do not describe it as a definitive failure or auto-retry it.
