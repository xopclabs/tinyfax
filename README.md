# tinyfax

tinyfax is a private network of thermal printers. A member sends a text or image from a browser; the recipient's printer produces it on paper. Each printer has an ESP32-S3, Wi-Fi, and a PeriPage P21 connected over USB. A managed MQTT broker carries messages between households. Sending does not require the sender's printer to be online.

The [roadmap](docs/roadmap.md) tracks progress. [OpenSpec changes](openspec/changes/) hold implementation tasks and verification results. The references below describe the intended system. Do not infer unspecified formats or policies from examples.

## Reference map

| Read | For |
| --- | --- |
| [Roadmap](docs/roadmap.md) | Milestones and steps before the two-household pilot |
| [Product contract](docs/product.md) | Required experience, scope, and operators |
| [System boundaries](docs/architecture.md) | Components and normal message path |
| [MQTT transport](docs/mqtt.md) | Session semantics, topics, broker permissions, delivery limits |
| [Print jobs](docs/print-jobs.md) | Raster data, transfer options, printing and deduplication |
| [Identity and cryptography](docs/identity.md) | Key roles, authentication, E2EE, signing, trust |
| [Membership and enrollment](docs/enrollment.md) | New printers, new browsers, recovery and revocation |
| [Browser application](docs/browser.md) | Public static sender, local storage and enrollment UX |
| [Local device management](docs/device-management.md) | AP behavior, Wi-Fi recovery, settings, blocklists |
| [Flash and OTA](docs/firmware-and-storage.md) | Persistence requirements, partitions, updates and rollback |
| [P21 integration](docs/hardware.md) | USB, keepalive, power and physical constraints |
| [Architecture rationale](docs/design-record.md) | Reasons behind the principal boundaries |
| [Unspecified interfaces](docs/unresolved.md) | Choices that must not be fabricated by an implementing agent |

The canonical definitions are in the named references. Other documents link to them instead of repeating their schemas or rules. Example MQTT topics, JSON snippets, and storage layouts are *illustrations*, not protocol specifications.
