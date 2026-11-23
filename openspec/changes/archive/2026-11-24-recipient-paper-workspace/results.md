# Workspace verification

Headless Chromium with a simulated MQTT client verified desktop recipient toggles, narrow-screen single selection and long-press multi-selection, a separate Settings view, credential restoration, and destructive mode switching. A two-recipient send produced two non-retained QoS 1 publications with distinct recipient IDs and encryption parameters. With one simulated unconfirmed publication, the UI showed separate results and preserved the draft.

Browser raster and secure encoding tests passed. With the ESP32-S3 bench receiver connected, it accepted both a text job and a full-width image job from Chromium through flespi. Each accepted raster hash matched an independent hash of the browser canvas. An initial back-to-back run hit the receiver's one-job waiting limit during directory refresh. The successful run waited for the first acceptance before sending the second job.

A separate live fan-out test used two scoped flespi readers. Each received exactly one non-retained publication addressed to it, even when subscribed to both test inboxes. The two publications used distinct encryption parameters. The test did not require two physical printers.

In a separate Chromium send to two recipients through flespi, the ESP32 accepted its job and logged the expected job ID and preview raster hash. A software receiver decrypted the second job to the same raster hash. Decryption of the ESP32 job with the software receiver's private key failed AES-GCM authentication. No paper was used.
