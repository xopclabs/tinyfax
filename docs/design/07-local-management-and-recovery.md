# Local management, recovery AP, and user controls

## Recovery principle

Every printer must be recoverable without opening the enclosure, soldering, reflashing, logging into a home router, or needing the creator to be online. A remote MQTT command is useful for maintenance only while internet/MQTT works, so **there must be an independent local path**.

No new physical button, display, encoder, or drilled case hole is required. Earlier ideas about a one-button reaction were explicitly deprioritized.

## Configuration AP lifecycle — agreed intent

The ESP32 supports simultaneous station and access-point operation. The intended behavior is:

1. On every power-up/reset, it starts a **unique password-protected setup AP** while trying its saved home network.
2. If nobody joins for roughly **five minutes** and home Wi-Fi is working, it turns the setup AP off. Five minutes is illustrative, not a final timeout.
3. If a client joins the setup AP, it remains available while the client is connected; after the last client leaves, a short grace period precedes shutdown.
4. A reconnection cancels pending shutdown. HTTP activity may also be used to distinguish an actively used setup page from an idle associated phone.
5. If home Wi-Fi is missing/unreachable or credentials have changed, the setup AP **remains available for recovery** while background home-network reconnect attempts continue.
6. If home Wi-Fi works but MQTT/broker is down, the local management page remains useful and must not require MQTT login merely to change local Wi-Fi settings.

Modern phones may leave an AP that lacks internet access automatically. Associated-station count alone is therefore not a sufficient UX signal; timeouts and graceful reconnection matter. An indefinitely associated but inactive phone may also need an administrative idle limit.

An AP can be managed by ESP-IDF Wi-Fi station-connect/disconnect events. This is technically feasible and does not require an external control.

## Access and recovery card

Illustrative provisioning information:

```text
Wi-Fi SSID: tinyfax-bob-7A92
AP password: unique high-entropy device secret
Setup URL: http://192.168.4.1
LAN name: http://tinyfax-bob.local
```

A QR card supplied with the gift may contain the permanent setup-AP Wi-Fi credentials. The local management UI can print a separate **one-time browser enrollment** QR/link on demand. The AP card and browser enrollment credential must be distinct.

`.local` hostnames use **mDNS**; a home router does not need a custom DNS server or a static DHCP reservation. DHCP assigns an ordinary IP; mDNS advertises the name despite address changes. mDNS may fail on some client/guest networks, so the AP's well-known address and a current IP display/print fallback remain useful.

A temporary recovery AP is **not** the same as leaving a permanently exposed administration server available to every LAN visitor. Protect the AP with a unique WPA2/WPA3 credential and use a separate device-management secret/appropriate authentication for sensitive operations; validate CSRF/session behavior if an HTTP admin UI is available on the LAN. A captive portal is a usability option, not itself a security boundary.

## Local management UI scope

The following capabilities were discussed as natural controls:

| Control | Intended meaning |
|---|---|
| Change Wi-Fi | Scan/select new SSID and enter password; preserve identity and last known-good configuration while testing |
| Connect a new browser | Create short-lived pairing token; show link and/or print QR; approve browser public signing key via MQTT |
| List/revoke browsers | Show authorized public signing key IDs, labels and revocation controls |
| Recover all web clients | Start fresh browser enrollment even when previous browser storage is gone; preserve printer credentials/keys |
| Block senders | Locally decline print jobs from selected other members; owner chooses whom to allow |
| Diagnostics | Connectivity, USB/printer status, firmware version, test print, queue/error state |
| Updates/reboot | Check or apply authorized firmware update, controlled restart |

A blocklist is local to each printer, not centrally imposed on the whole network. A sender may be broker-authenticated and cryptographically valid but still be blocked by the receiving device. This rule should be enforced *before* printing, and ideally before expensive storage/decryption where enough authenticated sender information is available.

## Credential reset versus physical factory reset

The design explicitly requires that **ordinary Wi-Fi recovery, browser revocation/enrollment, restart, and OTA do not reset**:

- Device MQTT identity and credentials
- Printer encryption private/public key pair
- Stable member/device identity

No everyday destructive full-identity factory reset was agreed. Erasing a printer's private key would render broker-queued jobs encrypted for the old key unreadable and require public-key rotation. A full erase is therefore a qualitatively different maintenance operation, not a casual button on the recovery UI.

## Power-cycle assumption

The AP-on-boot recovery mechanism works only if turning the appliance off/on or unplugging it actually **reboots the ESP32**. This depends on final power wiring. If the ESP32 is powered from an unswitched battery rail, the original printer power button may *not* reset it; alternatives discussed included sensing the existing switch or USB VBUS transitions, but none was finalized. The power design must be understood before treating a printer power-cycle as a guaranteed recovery signal.

## Remote management

An authenticated admin MQTT topic may request diagnostics, update checks, or enabling the setup AP while connected. It cannot recover a printer with no home Wi-Fi or failed internet and should not be the only way to access local controls. Remote commands should be bounded and not erase permanent identities.
