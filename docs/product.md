# Product contract


tinyfax turns short messages and pictures into paper at somebody else's home. It is a physical messaging appliance, not a chat app. Incoming messages are meant to be printed, not read and managed on a phone.

## Participants

A *member* is a person in the private network, identified by a stable ID and a preferred display name. A member normally owns one printer and can enroll multiple browsers (phone, laptop, another browser profile) to send as that member.

The network administrator prepares and admits new members when gifting printers. Members administer their own printer and enrolled browsers afterward. There is no public registration endpoint for arbitrary internet users.

## User-facing behavior

- A recipient's ESP32 receives and prints without depending on a computer or open browser at their home.
- A sender can use the public website from any internet-connected browser after enrollment. The sender's ESP32 need not be powered on.
- A message addressed to an offline printer may be queued by the MQTT provider, within that provider's session and storage limits. No unconditional delivery guarantee is implied.
- Members can enroll another browser or replace lost browser storage through their printer, without disassembly, reflashing or requesting manual key approval from the administrator.
- Members can change home Wi-Fi and manage incoming sender permissions through the device's local configuration page.
- Normal settings changes, browser recovery and firmware updates keep the printer's permanent identity intact.
- Adding a member makes the member discoverable to existing clients without redeploying every client or printer.

## Operational constraints

The intended appliance is inexpensive and normally plugged in. ESP32-S3 SuperMini-class hardware is the cost target. The case should not need an extra display, buttons, encoder or drilled holes. A new owner should not need a Raspberry Pi, an old laptop, port forwarding, a VPN, static DHCP reservation or a custom DNS server.

The administrator does not operate an application server on their VPS for normal printing. The network still relies on internet connectivity, a managed MQTT broker and availability of the hosted browser assets to load the public sending UI.

The product does not include incoming-message viewing on phones, threaded conversation history or a general chat replacement. Printer-side acknowledgment of transport or printing is distinct from a human reaction.
