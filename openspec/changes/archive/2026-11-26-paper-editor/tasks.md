# Tasks

## 1. Build Paper

- [x] 1.1 Match the desktop and narrow-screen layout and styling in the local `tinyfax_prototype.html` reference. Keep real People and Settings behavior and omit mock indicators and counts.
- [x] 1.2 Add a multi-element draft with automatic insertion, selection, move, resize, removal, text properties, and undo and redo. Verify that contextual controls do not affect raster output.
- [x] 1.3 Use one render for the preview, PNG export, and secure send. Keep the verified size cap and show when a draft is too large to send.

## 2. Verify

- [x] 2.1 Exercise editing and contextual controls in desktop and narrow browser layouts. Verify that preview and PNG pixels match for a mixed draft.
- [x] 2.2 Send a mixed draft to the ESP32 sink and compare its accepted hash with the preview. Check that recipient fan-out and acknowledgment still work. Record results and gaps in `results.md`.
