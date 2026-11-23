# secure-print-jobs Specification

## Purpose

Accept authorized monochrome raster jobs on the recipient ESP32 without requiring a printer.

## Requirements

### Requirement: Authenticated raster jobs

The sender SHALL encrypt the raster to the recipient and sign the canonical encrypted envelope with its browser signing key. The receiver SHALL check the recipient, sender authorization, signature, expiry, and size bounds before decrypting and SHALL validate the raster dimensions and length before acceptance. Private keys SHALL remain on the clients that generated them.

#### Scenario: Known raster fixture

- **WHEN** an approved browser sends a valid fixture to the intended receiver
- **THEN** the receiver reports job acceptance and the test sink reports the expected raster hash

#### Scenario: Invalid job

- **WHEN** a job is tampered with, unauthorized, addressed elsewhere, expired, or malformed
- **THEN** the receiver rejects it without passing a raster to the sink

### Requirement: Persistent duplicate rejection

The receiver SHALL persist the accepted job identity before reporting acceptance and SHALL retain that record until the signed expiry. It SHALL reject a new job if all 32 bench records are live, without evicting a live record. It SHALL wait for clock synchronization before processing jobs or reclaiming expired records. It need not persist the raster.

#### Scenario: Replay after reboot

- **WHEN** a previously accepted job is delivered again before expiry, including after restart
- **THEN** the receiver rejects the duplicate without passing it to the sink

#### Scenario: Replay store full

- **WHEN** all 32 records are live
- **THEN** a distinct valid job is rejected until a record expires and can be reclaimed

### Requirement: Authorization from retained records

In directory mode, the receiver SHALL require current administrator-owned membership and the sender member's complete, printer-owned approved signing-key record before accepting a job. It SHALL not use pre-reconnect cache entries to authorize queued jobs. It SHALL use the latest authoritative records it has processed at acceptance. The receiver SHALL hold at most one job pending authorization and reject it if the required records do not arrive within a bounded wait.

#### Scenario: Authorization changes while offline

- **WHEN** an administrator removes a sender or its printer revokes its signing key while the receiver is offline
- **THEN** the receiver rejects its queued job after reconnect, even if the job has not expired

#### Scenario: Sender printer offline

- **WHEN** a valid job arrives while the sender's printer is offline and the retained records authorize it
- **THEN** the receiver can accept the job without contacting the sender's printer
