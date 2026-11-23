# Bench directory records

The bench uses one namespace with separate topics for the complete member list and each member's complete approved signing-key set and public encryption key. Records are retained at QoS 1. Publish an empty signing-key set to revoke all browser keys for a member. Removing a member from the list is sufficient to prevent new acceptance, even if old key records remain.

| Topic suffix | Record value | Writer |
| --- | --- | --- |
| `members` | `{"members":["<member-id>"]}` | Administrator |
| `signing/<member-id>` | `{"keys":[{"id":"<key-id>","key":"<public-key>"}]}` | That member's printer |
| `encryption/<member-id>` | `{"id":"<key-id>","key":"<public-key>"}` | That member's printer |

Identifiers use 32 lowercase hexadecimal characters. Public keys use 130 lowercase hexadecimal characters encoding uncompressed SEC1 P-256 points. These records contain no private keys or broker tokens.

After each receiver connection, request a fresh retained delivery using a new MQTT 5 subscription identifier. Do not count subscription acknowledgments or deliveries tagged with an older subscription identifier as fresh records. A job that arrives before both records waits in one bounded slot. Missing or malformed records do not authorize a job. Later record updates apply to jobs not yet accepted.
