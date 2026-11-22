# Hardware and printer integration

## Final hardware direction

- **Printer:** PeriPage P21.
- **Controller:** cheap **ESP32-S3**, especially the inexpensive SuperMini class; an expensive XIAO was suggested then set aside due to cost.
- **Printer data and keepalive:** **USB**, not BLE, based on later successful hands-on tests.
- **Network:** 2.4 GHz Wi-Fi for MQTT and local administration.
- **Form factor:** controller installed inside the printer enclosure, with no extra screen or user-accessible buttons.
- **Power:** intended to stay plugged in; the final internal power/charging scheme is still under characterization.

The printer and ESP32 should work as one appliance while avoiding dependence on a PC/Raspberry Pi. There is no need to design a new printer PCB for the first iteration.

## USB interface: the plan changed

Early experiments used BLE and a laptop-based API/keepalive, and the initial assumption was that the printer could not be driven over USB. Later work **successfully demonstrated PeriPage P21 printing over USB**, tested USB keepalive, and demonstrated ESP32-S3-to-P21 printing on a breadboard. Therefore the firmware should treat **USB as the current validated printer transport**; BLE is historical context and not the baseline implementation.

Relevant P21 PCB points reported as located and tested:

```text
GND
regulated 3.3 V
USB D-
USB D+
```

A male USB-C breakout was ordered to make a more permanent interface by soldering onto the printer pads. Its arrival/integration were pending in the latest status report. The physical layout, cable orientation, USB-C role/CC wiring and exact host-stack implementation must follow the *working prototype's electrical design*; this document does not assert a universal pinout for arbitrary P21 revisions.

## Electrical power caveats

The printer uses an internal lithium-ion cell (described in discussion as an 18650). There are several independent electrical questions:

- Can the P21's existing regulated **3.3 V** rail deliver the extra transient current demanded by the ESP32-S3 during Wi-Fi operation and printing?
- Does the 3.3 V rail remain up when the printer is logically powered off or when USB charging is connected?
- Is the printer power switch an actual switched power path or a momentary logic button?
- Does the printer have real USB power-path/pass-through management, or does it primarily run from the battery node while being charged?
- Is additional regulation, isolation or filtering needed to avoid brownouts or backfeeding?

The fact that a stable 3.3 V rail was found and an ESP32-S3 breadboard print worked is strong evidence for the test setup, but does **not alone** validate thermal peaks, long-duration operation, charging scenarios, off-state leakage or safe permanent wiring.

Do not assume a generic board's `BAT+/-` pads imply a charger, 3.3 V buck-boost regulator, or a safe battery power path. Some boards have their own Li-ion charger; connecting two independent chargers to the same cell is not automatically safe. Do not feed a raw 18650 directly into the ESP32 3.3 V rail. An ESP32 development board's `5V` and `3V3` power pins vary by board and must be interpreted from its actual schematic.

## Power versus recovery

The agreed recovery UX starts the configuration AP on **ESP32 boot**. This has a hardware consequence: turning the printer off/on must restart the controller if a power cycle is meant to be the emergency way to reopen the AP.

If the ESP32 is attached to a rail that stays alive while the printer is “off”, the printer power button may not restart the ESP32. Previously discussed alternatives included monitoring an existing button or USB VBUS changes, but the final design is not settled. Power-path and recovery behavior should be understood as coupled decisions.

## Device resources

A basic S3 SuperMini may offer 4 MB flash with no PSRAM; model variants differ. Application cryptography, MQTT/TLS, Wi-Fi/AP, USB and A/B OTA fit as a **design expectation**, not yet a measured build. The bottleneck is likely flash layout and peak RAM/stack use, particularly for large MQTT publications. A flash-equipped S3 variant with more capacity is advantageous if cost is comparable; PSRAM is not required by the proposed streaming architecture.

## Alternative board discussion

- ESP32-C3 SuperMini was considered a budget Wi-Fi/BLE target.
- ESP32-C6 boards already owned by the creator were of interest for a **separate Zigbee/Home Assistant experiment**, potentially letting one printer serve as a Zigbee end device. Wi-Fi/BLE/Zigbee radio coexistence and low Zigbee throughput make Zigbee unsuitable as the primary image transport.
- ESP32-S3 was ultimately selected for the gift-printer direction, especially because S3 boards were comparably cheap and also useful for another project.

The current P21 USB solution further reduces the relevance of original BLE chipset comparisons. Zigbee experiments are optional and not part of the baseline tinyfax network.
