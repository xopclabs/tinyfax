# MQTT network model

## Transport — agreed

- ESP32 clients initiate MQTT connections over TLS, typically TCP port 8883 if supported by the selected provider.
- Browsers use **MQTT over secure WebSockets** (`wss://`) to the same logical broker.
- Jobs use **QoS 1**, accepting possible redelivery and requiring application-level duplicate detection.
- Printers have stable client IDs, persistent sessions, and nonzero session expiry to enable broker-side offline queues where supported.
- No broker failover list, bridging, multi-broker replication, or self-hosted broker is in scope initially.

MQTT message size, free-tier quotas, retention limits, subscription behavior, and ACL syntax depend on the specific provider and are **not yet verified for deployment**. Prior discussion considered **flespi** and **EMQX Cloud Serverless**, without selecting one. Provider conditions can change; any historic pricing/quota remarks are not architectural requirements.

## Example topic hierarchy — illustrative, not normative

```text
littlefax/v1/
  network/members                         # retained, owner/admin maintained
  users/<owner>/printer-key               # retained public encryption key
  users/<owner>/signing-keys/<key-id>      # retained, printer-approved browser key
  devices/<owner>/presence                 # retained online/offline
  devices/<owner>/enroll/request            # short-lived enrollment request
  devices/<owner>/enroll/response/<id>      # pairing result, scoped response
  devices/<owner>/control                   # privileged operations
  inbox/<recipient>/from/<sender>          # encrypted signed print job
  receipts/<sender>/<message-id>            # application-level delivery status
```

The precise structure must be designed together with ACL support. A broker's subscription wildcard (`+`, `#`) is different from how its *authorization* expressions work; do not assume arbitrary client-supplied topic paths prove identity. Public keys and member records need protection against unauthorized publication, replacement, and deletion. A display name inside a JSON payload is never itself trustworthy.

## Principal types and ACL intent

| Principal | Publish | Subscribe | Explicitly cannot do |
|---|---|---|---|
| `bob-web` | Bob-attributed outbound messages; enrollment **requests** | Directory, relevant receipts/approval response | Approve own browser signing keys; alter Alice's data; publish as Alice; run admin controls |
| `bob-device` | Bob's authorized browser key records/approval results; own presence/receipts | Bob's inbox and enrollment requests | Authoritative membership edits; act as other printers |
| Owner/admin | New-member provisioning and protected membership directory | Management/diagnostics as authorized | Should not need recipients' private encryption keys |

This is a *policy model*, not a deployable ACL file. Provider-specific permissions must be checked for topic substitution, subscriptions that reveal other traffic, retained-message deletion, and deny-by-default behavior.

**Correction to an earlier idea:** allowing `bob-web` to publish directly to `users/bob/signing-keys/+` is not enough for revocation. A stolen browser with unchanged shared credentials could simply register a new signing key. In the settled direction, only Bob's **printer device identity** can publish authoritative approved signing-key records; browsers may only request enrollment.

## Persistent sessions and offline delivery

When a recipient is offline, QoS 1 messages can be queued if:

- The receiver has previously established a persistent session under a stable client ID with the inbox subscription.
- Session expiry and any per-message expiry are long enough.
- The provider offers sufficient persistent queue storage and message size, and has not purged the session or queue.
- The relevant publication was accepted by the broker after the session/subscription existed.

This is **not** guaranteed durable storage across every provider outage or account migration. Queued messages can be lost through expiry, resource limits, service failures, or broker replacement. A PUBACK to the browser says the broker accepted the publication at MQTT QoS level; it does not establish the ESP32 saved or printed it.

## Presence and status

A printer can publish retained `online` status and configure an MQTT Last Will to publish `offline` upon unexpected disconnect. A new subscriber receives the last retained presence. This is advisory: failure detection takes time, and presence does not prove USB printer availability or paper output.

MQTT protocol keepalive is independent of the **USB keepalive** used to prevent the P21 from sleeping.

## Receipts

A receiver might send separate application-level acknowledgments such as `accepted` (verified and persisted) and `submitted-to-printer`. The specific receipt schema, delivery confirmation semantics, replay rules, and whether the UI presents them were not finalized. Do not equate MQTT QoS 2 with physical exactly-once printing.

## Administration and firmware triggers

A privileged control topic may carry small commands such as `check_update`, `reboot`, `enable_setup_ap`, `print_enrollment_qr`, or `diagnostics`. These are options discussed, not a defined remote-management API. Commands must be authenticated/authorized, bounded, and should not be a way to erase permanent identity. Broker-triggered updates are supplemented by boot-time or periodic update checks because offline printers cannot receive a non-persistent trigger.
