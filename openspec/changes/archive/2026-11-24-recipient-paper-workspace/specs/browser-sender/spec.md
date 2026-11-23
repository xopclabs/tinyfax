## MODIFIED Requirements

### Requirement: Preview and send the same raster

The sender SHALL offer Text and Image modes. A draft SHALL contain either left-aligned text or one image that fills the printable canvas width and preserves its aspect ratio. Switching modes SHALL clear the previous input. The Paper view SHALL show the exact monochrome raster to be sent. The sender SHALL prevent submissions beyond the verified receiver cap.

#### Scenario: Send each composition type

- **WHEN** a provisioned browser sends a text job and an image job after reopening the page
- **THEN** the ESP32 accepts each authorized job and reports a raster hash matching the browser preview

#### Scenario: Switch content mode

- **WHEN** a person switches from Text to Image or from Image to Text
- **THEN** the previous input and preview are cleared and Send is unavailable until the new mode has valid content

## ADDED Requirements

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
