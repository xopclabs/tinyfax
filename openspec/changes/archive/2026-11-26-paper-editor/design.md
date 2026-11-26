# Design

## Context

The verified sender already supports recipient selection, manual setup, monochrome preview, and separate encryption for each selected recipient. The editor replaces the single-content draft without replacing the send path.

## Goals / Non-Goals

Reproduce the reference prototype's layout and styling with the working sender. Keep Settings separate. Do not add printer readiness, sent or received counts, history, broadcast, or a confirmation dialog.

## Decisions

- On desktop, keep People at left and Paper at right. Put recipient chips and Undo/Redo above Add Text and Add Image. Center the paper in a vertically scrollable viewport. Show contextual properties beside it when an element is selected, without shrinking the paper to fit the available height. Keep Send at the lower right in the footer.
- On narrow screens, keep the existing People navigation and multi-selection. Fit the paper to the available width and scroll vertically. Open selected-element properties directly above the footer and bring the selected element into view. Keep Send accessible at the bottom.
- Follow the reference's restrained paper styling. The paper is the preview; omit a preview toggle, torn edges, and decorative texture. Keep editor selection handles out of the rendered output.
- Insert images full-width with their aspect ratio preserved. Insert text left-aligned at the next empty line. Allow selection, move, resize, removal, and contextual font, size, color, and alignment controls. Undo and redo edits to the current draft.
- Use a fixed logical paper width and grow the strip with its contents. The prototype uses 384 pixels; preserve that layout proportion without assuming it establishes the printer width or changing the verified transport cap. Reject oversize sends without cropping or silently scaling to fit.
- Render the draft to one monochrome raster. Derive the canvas preview, exported PNG, and encrypted publications from those same pixels. Preserve the existing per-recipient acknowledgment behavior.

## Risks / Trade-offs

A growing draft can exceed the current receiver budget. Editing and exporting can remain available when sending is blocked. The prototype's simulated recipients and send controls are not part of the working UI.
