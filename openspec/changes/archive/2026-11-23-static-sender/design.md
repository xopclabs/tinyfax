# Design

## Context

The bench sender uses a fixed recipient, a fixture raster, and a 763-byte publication cap. The agreed sender remains static and runs on localhost. GitHub Pages is separate work.

## Goals / Non-Goals

Support a recipient picker, persistent manual provisioning, and text and image composition with an exact preview. Do not build enrollment, a layout editor, printing, or a receipt protocol.

## Decisions

- Serve only browser assets. Keep the scoped credential and non-extractable signing key in IndexedDB under the localhost origin. Export only the public signing key for manual approval.
- Load members and retained encryption keys via WSS. Exclude missing or unusable keys. Address the selected member using its stable ID rather than its display name. Preserve the signed envelope and receiver authorization checks.
- Render text, then the image, on a white canvas. Convert to packed monochrome rows and construct the preview from those same bits. Reject compositions over the measured bench cap rather than silently cropping them.
- Verify the cap on the ESP32 and match browser preview hashes to the test sink. Check each composition type after reopening the page. Treat browser PUBACK as broker acknowledgment only.

## Risks / Trade-offs

A change in browser origin requires new provisioning. The bench cap is not a P21 or production limit. Local verification does not close public deployment on the roadmap.
