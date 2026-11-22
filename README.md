# tinyfax

A private, invitation-only network of autonomous thermal printers. A person sends a text or image from a browser; another person's physical printer produces it as paper. The system should feel like a tiny, friendly fax network rather than a messaging app.

This repository is **design and context documentation**, not an implementation plan. It consolidates the decisions and discussions that preceded software development. It deliberately distinguishes **agreed direction**, **working assumptions**, **illustrative design**, **open questions**, and **verified current state**.

## The idea in one paragraph

Each participant owns a PeriPage P21 (or compatible printer) containing a cheap ESP32-S3. The ESP32 joins home Wi-Fi, connects outbound to a managed MQTT broker, receives jobs, and prints over USB. People compose messages in a public, *static* web application that talks to MQTT over secure WebSockets. The web app can be used anywhere; the sender's printer need not be online. Each printer is the authority for its own encryption key and which browser signing keys may act for its owner. The broker routes and may queue messages, while the ESP32 provides local setup, recovery, and printing. Nothing in the production messaging path should depend on the creator's VPS.

## Read this first

| Document | Purpose |
|---|---|
| [Design decisions](docs/design/01-decisions-and-boundaries.md) | Agreed requirements, explicit non-goals, and strength of each decision |
| [System architecture](docs/design/02-system-architecture.md) | Components, responsibilities, and end-to-end flows |
| [MQTT network](docs/design/03-mqtt-network.md) | Routing, ACLs, persistent sessions, presence, and receipts |
| [Print jobs and data](docs/design/04-print-jobs-and-transport.md) | Image format, sizes, chunking options, delivery semantics |
| [Identity and cryptography](docs/design/05-identity-and-cryptography.md) | Key roles, encryption, signatures, trust assumptions |
| [Enrollment and membership](docs/design/06-enrollment-and-membership.md) | Adding people and browsers without manual key approval |
| [Local management and recovery](docs/design/07-local-management-and-recovery.md) | AP behavior, Wi-Fi changes, browser reset/revocation, blocklists |
| [Firmware, persistence and OTA](docs/design/08-firmware-storage-and-ota.md) | Persistent identity, partitions, updates and rollback |
| [Browser applications](docs/design/09-browser-applications.md) | Static composer, browser storage, local administrative UI |
| [Hardware and printer integration](docs/design/10-hardware-and-printer.md) | ESP32-S3, P21 USB, power, and physical assumptions |
| [Alternatives considered](docs/design/11-alternatives-considered.md) | P2P, centralized server, Telegram, BLE, Zigbee, failover |
| [Unresolved details](docs/design/12-open-questions.md) | Areas where the discussion did not establish a protocol or final choice |
| [Current project state](docs/status/CURRENT_STATE.md) | **What has actually been purchased, tested, and verified** |

## Decision notation

- **Agreed** — a design direction explicitly accepted in the conversation.
- **Preferred** — a leading approach, but not a finalized protocol or service selection.
- **Illustrative** — example topics, structures, durations, sizes, or workflows; not a wire-level specification.
- **Open** — not decided and should not be silently treated as fixed.
- **Verified** — reported as already tested or completed, recorded only in the status document.

## Scope and authority

The initial audience is the creator and a small group of friends, including a couple receiving printers as gifts. Membership is provisioned by the creator, not open self-registration. Device owners can independently add and remove their browser clients and administer their own printer. The architecture should permit adding more friends later without reconfiguring existing printers by hand.

This documentation is intentionally descriptive. It does **not** prescribe a task sequence, a sprint plan, a particular codebase layout, or detailed implementation APIs. Its purpose is to provide a reliable foundation for further design work with a local agent.
