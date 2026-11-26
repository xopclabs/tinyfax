## ADDED Requirements

### Requirement: Render a composed paper raster

Paper SHALL combine multiple text and image elements in one draft and show the exact monochrome raster to be sent. PNG export SHALL contain the same pixels without editing controls. The sender SHALL prevent submissions beyond the verified receiver cap without cropping the draft.

#### Scenario: Send each composition type

- **WHEN** a provisioned browser arranges multiple text and image elements and sends the draft
- **THEN** the ESP32 accepts the authorized job and reports a raster hash matching the Paper preview and PNG export

### Requirement: Edit elements on Paper

Paper SHALL insert new images at full logical width with their aspect ratio preserved and new text left-aligned below existing content. People SHALL be able to select, move, resize, and remove individual elements and change a text element's font, size, color, and alignment. The current draft SHALL support undo and redo.

#### Scenario: Adjust and undo an element edit

- **WHEN** a person moves or resizes an element and then undoes the edit
- **THEN** the element returns to its previous position and size, and redo restores the edit

### Requirement: Contextual paper workspace

Paper SHALL show a vertically scrollable strip whose logical width stays fixed as the strip grows. Desktop SHALL place properties next to the paper only when an element is selected. Narrow screens SHALL show selected-element properties above the footer and keep Send available at the bottom. The canvas SHALL provide the monochrome preview without a separate preview mode.

#### Scenario: Select an element on a narrow screen

- **WHEN** a person selects an element on a narrow screen
- **THEN** its properties open above the footer and the selected element is brought into view

## REMOVED Requirements

### Requirement: Preview and send the same raster

**Reason**: The paper editor replaces exclusive Text and Image modes.
**Migration**: Use the composed paper raster requirement for preview, export, and sending.
