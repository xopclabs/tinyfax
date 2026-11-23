# Bench verification

An attached ESP32-S3 ran the receiver built with ESP-IDF 5.5.4. Chromium generated its signing key and retained it across a page reload. The ESP32 generated its decryption key. USB serial exchanged only public keys. The localhost sender published the encrypted fixture over flespi WSS, and the ESP32 received it over MQTT/TLS. The browser acknowledgment ID matched the serial acceptance ID. The sink reported the expected SHA-256 of the eight fixture rows, `eb266379c69a34280593fb2d4ea1f0293568650503cde89fc21d0b947447ecc4`.

A WSS test publisher using the same Web Crypto encoder verified acceptance at the 763-byte bench publication cap. The device rejected a publication one byte over the cap, a repeated accepted job on the same boot, tampered ciphertext, an unapproved signer ID, a different recipient ID, an expired job, and inconsistent raster dimensions.

A USB-console software reboot preserved the accepted job ID. On reconnect, replay was rejected. The receiver rejected a distinct job once all 32 records were live, still rejected a replay of a live ID, and accepted a new job after short-lived records expired.

Generic clients used four disposable flespi role tokens to verify retained membership and public-key reads, denial of browser writes, and denial of cross-member key replacement and deletion. The broker delivered the requested MQTT 5 subscription identifier with the retained records. Temporary records were cleared and the tokens revoked.

On the ESP32, Chromium sent a fixture using the retained recipient encryption key. The receiver accepted it using the retained membership and signing-key records with the sender's device offline. With the signing-key record absent, one job waited, a second job was rejected as busy, and the waiting job timed out without acceptance.

In two separate 40-second receiver Wi-Fi interruptions, Chromium published while the receiver was offline. Before reconnect, the sender's device role removed its approved key in the first test, and the administrator removed the sender in the second. Each queued job waited for fresh records after session resume and was rejected. A larger MQTT receive buffer was needed for flespi connection acknowledgments with the scoped directory credentials and persistent subscriptions.

These tests used disposable bench identities, one ESP32-S3, and no printer. They do not establish a production payload limit or offline batch delivery.
