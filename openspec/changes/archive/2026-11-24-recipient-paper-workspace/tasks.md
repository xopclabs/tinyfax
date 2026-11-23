# Tasks

## 1. Build the workspace

- [x] 1.1 Build desktop People and Paper and narrow-screen selection, including tap and long press. Show selected recipients at Send.
- [x] 1.2 Move manual sender setup to Settings and put diagnostics outside the normal workspace. Verify a provisioned browser returns to the workspace.
- [x] 1.3 Add exclusive text and image modes, destructive mode switching, full-width proportional image layout, and packed-raster preview with the existing cap.

## 2. Send and verify

- [x] 2.1 Publish a separately encrypted job per selected recipient. Report acknowledgment per person and preserve the draft on unconfirmed sends. Verify a partial acknowledgment without adding retry controls.
- [x] 2.2 Verify desktop and narrow-screen interactions in a browser. Send text and image jobs to the ESP32 sink and confirm preview hashes. Verify fan-out with scoped test readers and record results and gaps in `results.md`.
