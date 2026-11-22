# PeriPage P21 and ESP32-S3 integration

Tested physical observations are recorded in [the dated status snapshot](../status/2026-11-21.md).

## Assembly model

A low-cost ESP32-S3 SuperMini-class board sits inside a PeriPage P21 and acts as the printer's Wi-Fi/network and USB controller. The P21 remains the physical printer. A custom replacement printer PCB, new display, rotary encoder and additional user buttons are outside the appliance hardware baseline.

The control path uses the P21's USB interface, not Bluetooth. The P21 USB command implementation and USB keepalive are independent responsibilities: printing sends bitmap/print commands, while keepalive prevents unwanted P21 sleep between messages. The exact keepalive period and P21 protocol bytes belong in the tested driver source when that source is placed in the repository; they have not been supplied here.

The known useful printer PCB signals are ground, a regulated 3.3 V point, and USB D- and D+. The ESP32-S3 is intended to interface through the native USB hardware, but final connector orientation, electrical protection and wiring details need confirmation against the tested breadboard assembly. The proposed male USB-C breakout is a physical integration aid, not a network component.

## Power boundary

The appliance is expected to remain plugged in. That does not establish whether USB power runs the printer load directly or merely charges its 18650 cell. The printer's charger IC and power-path topology have not been identified in the supplied information. The regulated 3.3 V test point has been found, but its spare current capacity, startup behavior and behavior during printing are not established here.

The ESP32 must not be tied directly to a raw Li-ion cell rail without a suitable supply design. Cheap SuperMini boards differ in whether they expose battery pads, regulators or charging circuitry; the actual board needs inspection. Two unrelated battery chargers connected to one cell should not be assumed safe. When selecting an internal supply, account for ESP32 current bursts, print-head current spikes, ground return, USB backfeeding and brownouts.

The intended recovery behavior requires a way for the user to cause an ESP32 boot or otherwise activate the local setup AP. Powering the ESP32 from an always-live battery node could make the printer's original power switch ineffective as a recovery trigger. See [device management](device-management.md).

## Printer-driver boundary

The USB printer driver receives already validated raster jobs or row/chunk streams from the device application. It should not need MQTT topics, browser signing keys or network member information. The protocol transport and print job conventions are described in [print jobs](print-jobs.md).

The target raster width was discussed as roughly 384 pixels; that value and bit packing are hypotheses until pinned to the working P21 USB implementation. Long prints, USB disconnect/reconnect behavior, sleep/wake reliability and peak current are empirical device properties, not claims in this reference.
