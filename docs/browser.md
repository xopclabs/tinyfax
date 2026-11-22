# Browser application


## Sending interface

An enrolled browser restores its own MQTT authentication credential and signing key, connects to the managed broker over WSS, reads the member directory and public keys, and lets the user address a print to a member. It accepts text and images, prepares a thermal-print preview and publishes the encrypted, signed job. The recipient's ESP32 is responsible for printing; the sender's ESP32 is not involved.

The public page is usable outside the home LAN. It does not require a separate account database or an application backend: its broker connection authenticates the user. A static host such as GitHub Pages is a candidate, not a selected deployment. If the static host is unavailable, a fresh browser cannot necessarily load the site; this does not by itself disconnect printers already using MQTT.

The UI may show delivery status when application-level receipts exist, but the product does not display incoming private messages or maintain chat history on the phone. The source of truth for printer output is the device; recipient metadata and public keys come from the protected network directory.

## Browser secrets and keys

The browser needs a scoped MQTT credential and its own signing private key; the printer's decryption key is never copied to the browser. The browser may store the MQTT credential and a non-extractable Web Crypto `CryptoKey` in IndexedDB. Page JavaScript can use the key to sign, even though it cannot normally export its raw value; the website's origin and script supply remain part of the security trust boundary. See [identity](identity.md).

New browsers enroll through the printer-controlled procedure in [enrollment](enrollment.md). Stored credentials are reusable for subsequent visits from the same browser profile. A different profile, lost browser data or an explicitly revoked browser requires fresh enrollment.

## Relationship to local device UI

The ESP32 has a different, local management interface for Wi-Fi, browser enrollment and printer settings. It may be opened at an mDNS `.local` hostname on a compatible LAN or through the recovery AP. It is not required to run the public sender application. The administrative interface is defined in [device management](device-management.md).

Browser Web Crypto requires a secure context, normally HTTPS. A plain `http://tinyfax-*.local` origin should not be treated as equivalent to the public HTTPS composer when designing cryptographic browser operations.

The frontend framework, hosted URL, raster rendering library, receipt display and exact local-storage schema are not defined yet.
