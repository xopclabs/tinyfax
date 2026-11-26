# browser-sender Specification

## Purpose

Compose and securely send a monochrome print job from a static browser page without requiring a printer for verification.

## Requirements

### Requirement: Restore a manually provisioned sender

The localhost sender SHALL restore the scoped broker credential and its own non-extractable signing key from the same browser profile. It SHALL list only directory members with usable public encryption keys.

#### Scenario: Return to the sender

- **WHEN** a manually provisioned browser reopens the page
- **THEN** it can select an eligible recipient and send without entering the credential again

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

### Requirement: Choose recipients in People

The sender SHALL show eligible directory members without printer readiness indicators or message counts. Desktop SHALL show People beside Paper and allow each person to be toggled independently. Narrow screens SHALL open Paper on a tap and allow a long press to start multi-selection with a separate action to open Paper for that selection. The sender SHALL NOT offer Select All or broadcast.

#### Scenario: Choose multiple recipients on a narrow screen

- **WHEN** a person long-presses a member, taps a second member, and opens Paper for the selection
- **THEN** Paper shows both recipients as the send targets

### Requirement: Send to selected recipients

The sender SHALL show the selected recipients near Send and send without a confirmation dialog. It SHALL encrypt the same raster separately for each selected recipient and report which publications the broker acknowledged and which it could not confirm, without implying device receipt or printing. It SHALL preserve the draft on an unconfirmed send and SHALL NOT offer a dedicated retry action.

#### Scenario: Partial broker acknowledgment

- **WHEN** the broker acknowledges one recipient's publication but the sender cannot confirm another's
- **THEN** the sender identifies both outcomes by recipient and preserves the draft

### Requirement: Separate sender Settings

Manual sender setup SHALL be available on a separate Settings page. A provisioned browser SHALL open the workspace without exposing credentials, key controls, or bench diagnostics in the main workflow.

#### Scenario: Edit sender setup

- **WHEN** a person opens Settings from the workspace
- **THEN** they can access manual sender setup without displaying those controls in Paper
