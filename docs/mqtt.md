# MQTT transport


## Connections

Printers establish outbound MQTT/TLS connections. The public HTTPS website connects to the broker over MQTT/WSS using browser-scoped credentials. Neither needs an internet-reachable listener in a home router.

Each printer keeps a stable MQTT client ID, a persistent subscription to its inbox and a nonzero session lifetime. Print publications use QoS 1. MQTT can redeliver QoS 1 messages, so the application needs unique job IDs and a persistent deduplication policy described in [print jobs](print-jobs.md).

A printer may publish retained online presence and set an offline Last Will. Presence reports MQTT connectivity, not successful USB printing. MQTT's own keepalive is separate from the USB keepalive for the P21.

## Offline delivery boundary

A broker can queue QoS 1 messages for an absent printer only when the relevant persistent session/subscription already exists, has not expired, and has sufficient provider queue capacity. Message expiry, session expiry, storage quotas, and provider restarts can discard queued work. A new printer that has never subscribed cannot be assumed to have an offline inbox.

MQTT PUBACK confirms handling at the MQTT protocol level. It does **not** prove that an ESP32 accepted, persisted, decrypted or printed the message. If those distinctions are exposed, they require application-level receipts.

There is no requirement to buffer every outgoing message on the sender's ESP32. Browser messages go directly to the recipient through MQTT even if the sender printer is offline. If both printers are off, a still-online browser can publish and the broker may queue for the recipient under the conditions above.

## Suggested topic families

A candidate namespace, useful when assessing provider ACL capabilities:

```text
tinyfax/v1/members                         admin → all, retained

tinyfax/v1/keys/encryption/<member>       owner device → all, retained
tinyfax/v1/keys/signing/<member>/<key-id> owner device → all, retained

tinyfax/v1/inbox/<recipient>/from/<sender> sender web → recipient device
tinyfax/v1/receipts/<sender>/<message-id> recipient device → sender web

tinyfax/v1/enroll/<member>/request        member web → member device
tinyfax/v1/enroll/<member>/response       member device → member web

tinyfax/v1/presence/<member>              member device → all, retained
tinyfax/v1/control/<member>               administrator → member device
```

A production schema must specify unique enrollment request correlation, replay protection, receipt routing, subscriptions, retained-key deletion and payload versioning. Do not ship these examples as they stand.

## Authorization model

Broker permissions should default to deny and be bound to authenticated principal identities, not user-supplied JSON names. In particular:

- A browser authenticated as Bob can publish Bob-attributed jobs to permitted recipients, and request enrollment for Bob; it cannot approve its own signing keys or publish as Alice.
- Bob's printer can subscribe to Bob's incoming jobs and enrollment requests, and can publish Bob's authorized signing-key records and public encryption key; it cannot modify Alice's key records.
- Only an administrator identity can add or remove network members or issue privileged cross-device controls.
- Recipients must verify application signatures using [approved keys](identity.md); broker authentication alone is not a cryptographic proof of authorship.

For example, an ACL may permit `tinyfax/v1/inbox/+/from/bob` for Bob's web identity. Whether the provider supports username substitution, pattern matching in authorization rules, restrictions on retained-message deletion and scoped subscriptions must be verified against its actual ACL implementation. MQTT subscription wildcards are not automatically an authorization policy.

## Broker selection

No provider has been selected. **flespi** and **EMQX Cloud Serverless** were considered for managed hosting. Selection depends on present WSS/TLS support, topic ACL granularity, session persistence, queue limits, maximum publication size, client limits and cost. Free-tier figures are not fixed here because they change independently of the project.

The initial design uses one logical broker. Independent backup brokers would not share pending messages or session state automatically. Broker failover and bridging are not part of this transport contract.
