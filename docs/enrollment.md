# Membership and browser enrollment

The pairing payload and MQTT request/response fields are not yet specified.

## Admission of a new member

Membership is administrator-provisioned. Before handing someone a printer, the administrator assigns a stable member ID, creates scoped MQTT credentials and access rules for the printer and its browsers, configures the printer to recognize its network and publishes the member's discoverable record through an administrator-controlled directory.

The printer can then create its own encryption key pair on initial provisioning and publish the corresponding public key under a topic reserved for that printer. The private key is never needed by the administrator. Once the member directory and relevant key record are visible, existing browsers can find the new recipient without new firmware or web assets.

There is no anonymous sign-up. A provisioning script is a possible implementation, but its CLI, broker management API and secret distribution are not specified.

## Enrollment of a browser owned by an existing member

The printer, not the browser, authorizes new signing keys. One enrolled browser can send while its printer is offline; enrollment of a **new** browser requires that owner's printer to be reachable through MQTT to approve it.

```text
Owner             Local printer          Public website          MQTT broker
  | Open local        |                         |                       |
  | management UI     |                         |                       |
  |------------------>|                         |                       |
  | Request pairing   |                         |                       |
  |------------------>|                         |                       |
  |                   | Create short-lived      |                       |
  |                   | one-use pairing token   |                       |
  |<------------------| Show/print QR or URL    |                       |
  | Open URL ---------------------------------->|                       |
  |                   |                         | Generate browser      |
  |                   |                         | signing key pair      |
  |                   |                         | Connect via MQTT/WSS  |
  |                   |<-----------------------------------------------|
  |                   |        request: public key + pairing token      |
  |                   | Verify token, bind key  |                       |
  |                   | to owner, approve       |                       |
  |                   |----------------------------------------------->|
  |                   |   protected signing-key registration/response   |
  |                   |                         |<----------------------|
  |                   |                         | Save approved identity|
```

The local management page can display the enrollment URL and ask the P21 to print a QR code containing the same link. A QR can include a short-lived enrollment token and the member's limited browser MQTT bootstrap credential. For example, the web app might read an enrollment payload from the URL fragment, which is not sent as part of the HTTP request to the static host. The fragment is still readable by that site's JavaScript, browser history and extensions; the link is a bearer secret and must expire after first use or a bounded period.

A phone connected to the ESP32's setup AP may have no internet. The user can leave that AP, reconnect to home Wi-Fi or mobile data, and then open the printed link. The final protocol needs to tolerate that transition.

After printer approval, the browser retains its scoped MQTT credential and private signing key. Later visits use the stored values automatically; no printer interaction or repeated QR scan is required. Each browser profile can enroll its own key. The printable credentials belong to a browser identity, not the printer's privileged MQTT identity.

## Registration authority and revocation

Browsers may submit signing-key registration requests, but may not publish authoritative approved signing-key records. The printer alone publishes or revokes its member's authorized keys, with the broker enforcing the device's exclusive write permission. This is necessary because a stolen browser retaining a shared MQTT credential could otherwise register a replacement key after its original signing key was revoked.

A revoked signing key must stop being accepted by receiving printers. Revoking only the signing key does **not** revoke a shared browser MQTT password: the old browser may still publish ciphertext that recipients reject. Revoking a compromised MQTT credential or issuing separate credentials per browser requires a distinct broker-credential management policy, which is not yet fixed.

Recipients should synchronize the authoritative signing-key directory before trusting delayed jobs after an offline period. What to do with ciphertext legitimately sent before a key was revoked is an unresolved security policy; see [unspecified interfaces](unresolved.md).

## Recovery after losing all browsers

The owner opens the local configuration UI using their printer's separate recovery secret and starts browser enrollment again. There is no need to restore a lost browser signing private key; a new browser generates a new one and gets printer approval. The printer retains enough limited browser bootstrap information to authorize a new web MQTT session, or an equivalent provisioned recovery mechanism. The details of rotating compromised browser credentials are separate from ordinary enrollment.

The permanent printer MQTT identity and decryption key do not change during browser enrollment, replacement or revocation. See [device management](device-management.md) for reaching the setup UI when home Wi-Fi is unavailable.
