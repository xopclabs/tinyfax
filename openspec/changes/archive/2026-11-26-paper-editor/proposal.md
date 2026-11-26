# Proposal

## Why

The browser workspace sends one text note or one image. A paper editor lets people arrange several elements in one print without changing how recipients are selected or how jobs are sent.

## What Changes

- Match the reference prototype's People and Paper layout, paper viewport, contextual controls, and responsive styling.
- Replace exclusive Text and Image modes with a canvas for multiple text and image elements. Add movement, resizing, text properties, removal, undo, and redo.
- Render one monochrome raster for the paper preview, PNG export, and sending.

## Capabilities

### New Capabilities

### Modified Capabilities

- `browser-sender`: Adds paper editing and PNG export while preserving recipient selection and secure sending.

## Impact

Changes the browser workspace, rasterizer, and browser tests. Printer readiness, relationship counts, hosting, and changes to the job protocol are out of scope.
