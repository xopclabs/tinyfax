# Local device management and recovery


## Access paths

Every ESP32 exposes a local configuration interface. After DHCP assigns a home-LAN address, the ESP32 can advertise an mDNS name such as `tinyfax-bob.local`. mDNS does not require custom router DNS or a static DHCP reservation, but some clients and guest Wi-Fi networks do not resolve it. The independent fallback is a password-protected ESP32 SoftAP, with a known private setup address such as `192.168.4.1`.

A separate device-specific setup credential controls access to the AP, and sensitive management actions must require appropriate local authorization. Do not use the printer's privileged MQTT credential as the AP password. On the home LAN, protect management endpoints from casual access and browser-origin attacks; being on the same Wi-Fi is not proof of ownership.

## AP lifecycle

The desired lifecycle is:

```text
On ESP32 boot:
    start setup AP
    attempt saved Wi-Fi connection (STA)

Home Wi-Fi connected and no setup client:
    after roughly five minutes, stop setup AP

At least one associated setup client:
    keep AP available; cancel pending shutdown
    after last disconnect, allow a short grace period
    if a client reconnects, cancel shutdown again

Saved Wi-Fi absent or connection repeatedly fails:
    keep setup AP enabled for Wi-Fi recovery
    continue bounded Wi-Fi retry logic

Wi-Fi connected, MQTT unavailable:
    local management remains accessible over LAN/AP
```

ESP-IDF Wi-Fi events report SoftAP station connections and disconnections. Association alone does not imply the setup form is actively being used; the implementation should handle phones automatically switching away from Wi-Fi without internet, abandoned sessions and idle timeouts. The timeouts above are behavioral examples, not locked constants.

Entering AP recovery does not reset identity or erase saved Wi-Fi credentials. A new SSID/password should be tested before discarding a working configuration. If the home network changes completely, the AP still provides access.

## Management surface

The local interface covers:

| Control | Behavior |
| --- | --- |
| Wi-Fi | View connection status, select/change SSID and password, recover after router changes |
| New browser | Mint a single-use enrollment link and show it as a URL and optionally a printed QR |
| Browsers | List approved signing-key identities and revoke them |
| Browser recovery | Enroll a replacement browser even when all prior browser data is lost |
| Incoming policy | Maintain an owner-controlled blocklist of senders |
| Diagnostics | Show network, MQTT and USB printer state, with optional test print |
| Device operations | Restart and request a firmware update check, subject to authorization |

Blocklisting is decided by the recipient printer. A properly signed message from a blocked member is not printed. The sender's broker credentials do not override this local decision. Whether the sender receives a rejection receipt is an application-level policy not yet specified.

Print a setup or enrollment QR only when requested or during initial configuration. Normal boots should not waste thermal paper. A permanent recovery card can carry the AP SSID/password and setup address; enrollment QR links must instead be temporary and single-use.

## Power-cycle recovery

This boot-time recovery mechanism depends on the ESP32 actually restarting when the owner cycles appliance power. The finished electrical wiring is not yet settled. If the ESP32 is fed from an unswitched battery line, the P21 power switch or unplugging USB may leave the ESP32 running. That would remove power cycling as a reliable recovery trigger. The final power implementation must preserve a predictable local recovery path without drilling the enclosure.

## Remote maintenance boundary

The administrator may send scoped MQTT commands to request diagnostics, reboot, update checks or temporary AP enabling while the device is online. These controls cannot repair a device that lacks Wi-Fi or broker connectivity. They must not erase permanent MQTT credentials or the printer's decryption key. A destructive factory reset is not an everyday user operation; see [flash and OTA](firmware-and-storage.md).
