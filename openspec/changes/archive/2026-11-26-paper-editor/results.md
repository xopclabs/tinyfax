# Paper editor verification

Headless Chromium exercised a mixed draft, contextual image sizing, undo and redo, and PNG export. The decoded PNG matched the preview pixel for pixel. In a 430-pixel touch-enabled viewport with a simulated directory, selecting text opened its properties. Moving text beyond the receiver limit disabled Send while leaving PNG export enabled. Undo restored Send.

A desktop Chromium send used flespi and two scoped recipients. The ESP32-S3 accepted its job and logged the expected ID and preview raster hash. A software receiver decrypted its job to the same raster and could not decrypt the ESP32's publication. No printer was attached and no paper was used.

The narrow-screen check used browser emulation, not a physical phone. The receiver limit remains 4,096 bytes including dimensions. A 384-pixel-wide draft can send at most 85 rows under that limit.

On 2026-11-26, all three tests in `browser/test/` passed under Node.js. The local server returned successful responses for the browser page and both editor modules. This check did not repeat the browser or hardware tests.
