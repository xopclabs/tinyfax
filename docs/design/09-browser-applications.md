# Browser applications and UX

## Public static composer — preferred

The product's main *sending* experience is a static HTTPS website, potentially hosted on GitHub Pages, Cloudflare Pages, or similar static infrastructure. The exact host and UI framework were not selected. It is not a creator-operated application backend.

The website:

- Loads in any compatible phone or desktop browser, including outside the owner's LAN.
- Connects to the managed MQTT broker using **secure WebSockets**, authenticating with an enrolled browser's scoped MQTT credentials.
- Finds participants and relevant public keys through the protected MQTT directory.
- Lets the sender choose a recipient, write text and/or choose an image, and preview a thermal-printer rendering.
- Performs width adjustment, monochrome dithering/rasterization and message encryption/signing locally.
- Publishes directly to the **recipient printer's** MQTT inbox.
- May show accepted/received/printed statuses if an application receipt protocol is implemented.

No separate website password, login database, REST API, or per-send involvement by the sender's ESP32 is required. **MQTT authentication doubles as the website login** once the static assets are loaded.

## First visit and local browser identity

During enrollment, the printer's local configuration UI produces a QR/link containing short-lived enrollment data and the necessary **browser** MQTT connection credential. The browser website then creates a signing pair and asks the printer over MQTT to approve its public key. After approval, subsequent visits reconnect automatically using stored credentials and signing key.

The private signing key is ideally a **non-extractable `CryptoKey`** stored via IndexedDB. Such a key cannot be exported normally through Web Crypto, but JavaScript running under the origin can still ask it to sign. MQTT username/password or bearer tokens are client-accessible by design and must be restricted by the broker ACLs; device credentials or broker administrator credentials must never be embedded in public JavaScript.

A new phone, a new browser profile, or cleared site storage means new enrollment. Existing phone clients do not depend on the sender's printer being online for normal message sends.

## Local management interface — distinct role

The ESP32 also serves a local configuration UI, available via its temporary setup AP and potentially at an mDNS hostname on the home LAN such as `http://tinyfax-bob.local`.

This interface is primarily for **Wi-Fi configuration, recovery, enrolling/revoking browsers, blocklists, diagnostics and device administration**, not for reading received messages. mDNS works without custom DNS/DHCP reservations when the client/router support it; AP address/printed recovery details are fallback paths.

The local HTTP origin may not be a browser **secure context**. In particular, normal Web Crypto `crypto.subtle` operations are not guaranteed from `http://*.local`. The design keeps browser signing-key generation on the **public HTTPS website**, which also avoids having to solve HTTPS certificate distribution for every ESP32.

## Remote access is intentional

An earlier LAN-only preference was revised. The final direction is *not to depend on the creator's VPS*, **not** to prohibit remote sends. A public static page can send directly through MQTT from any internet-connected browser. This works while the sender's own printer is offline, and it is part of the desired behavior.

## Availability dependencies

Static hosting is lighter to maintain than a personalized application backend, but it is still a dependency for *loading* the public UI. Already-loaded/cached assets may survive a hosting outage; an installable/cached PWA was mentioned as an optional possibility, not a requirement. The MQTT broker remains a more direct dependency for cross-network sends and printer delivery. Hosting the page does not entail running the creator's own VPS.

## Product boundaries

The printer is intended for delightful physical output, not phone-based chat or browsing received messages. A physical single-button reaction was considered but rejected as insufficiently useful for the required enclosure modification. Reactions, receipt UX, queue browser history, templates and rich image editing are potential later product choices, not currently specified behavior.
