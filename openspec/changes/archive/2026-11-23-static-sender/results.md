# Static sender verification

On the ESP32-S3 with ESP-IDF 5.5.4, the receiver accepted a 4,347-byte signed and encrypted publication with a 4,096-byte raster including its dimensions. It rejected a publication one byte over the cap. This is a bench limit, not a measurement of the maximum possible payload or the printer's dimensions.

Headless Chromium loaded the localhost page. A manually supplied scoped credential and its browser-generated signing key survived closing and reopening the page in the same browser profile. The recipient picker loaded a member from retained records. For text-only, image-only, and combined input, flespi acknowledged the publication and the ESP32 logged the same job ID and packed raster hash shown by the browser. The UI disabled sending when the test text exceeded the raster budget. No printer was attached.

The browser and ESP32 used the same home network for these runs. The [transport verification](../2026-11-22-paper-free-mqtt-path/results.md) covers off-network delivery. Public hosting was not tested.
