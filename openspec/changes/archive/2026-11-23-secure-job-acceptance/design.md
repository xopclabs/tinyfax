# Design

## Context

The archived paper-free MQTT path verified browser WSS, ESP32 MQTT/TLS, and receiver session resume on flespi Free. Reuse the localhost sender, USB provisioning, and serial log. Success means job acceptance at the test sink, not a browser receipt or physical output.

## Goals / Non-Goals

Prove secure acceptance with manually exchanged public keys, then with authoritative retained records. Use a fixed monochrome raster. Do not build enrollment, a composer, USB printing, or a durable raster queue.

## Decisions

- Generate the browser ECDSA key and ESP32 decryption key on their respective clients. Persist the browser key locally as a non-extractable key and the receiver key on the device. Exchange only public keys with local tools over the existing bench setup. Use disposable fixtures for interoperability tests.
- Use P-256 ECDH, HKDF-SHA-256, AES-GCM and ECDSA P-256/SHA-256 through maintained libraries. Define canonical signed bytes and explicit key, signature, nonce, and AAD encodings before testing interoperability. Bind both identities, both key IDs, job ID, expiry, encryption parameters, and ciphertext to the signature. Authorize and verify before decrypting.
- Use one versioned, non-retained QoS 1 binary publication and bounded raster dimensions and field lengths. Set the bench size cap from target measurements. Do not add chunking or compression. Report the accepted job ID and fixture hash over serial without logging private keys or plaintext raster content.
- Issue jobs with a signed 10-minute lifetime. Reject expired jobs and expiries beyond the permitted lifetime. Reuse startup clock sync. Commit the acceptance record before calling the sink. Reclaim only expired records and reject new jobs when all 32 records are live.
- Use one complete retained member list and one complete retained signing-key record per member, including empty key sets. The administrator owns membership. A device identity owns its member's public encryption key and approved signing-key record. Use a generic client with a second scoped device-role credential to publish the sender's records without a second physical ESP32. Approve test browser keys manually, without enrollment. Verify that a browser cannot authorize itself and that a device cannot edit another member's keys.
- After reconnect, use a fresh retained lookup for the membership list and the sender's key record. Invalidate the pre-reconnect authorization view and hold at most one job in memory while waiting. Do not treat subscription acknowledgment as proof that records arrived. Fail closed on timeout or missing authorization and use the latest processed authoritative records at acceptance.

## Risks / Trade-offs

Acceptance does not preserve the raster across reboot. The one-job waiting limit is for the bench, not an offline batch-delivery guarantee. Revocation does not undo jobs already accepted or promise that every receiver sees the update simultaneously.
