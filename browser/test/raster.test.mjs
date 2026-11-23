import assert from 'node:assert/strict';
import test from 'node:test';
import { packRaster, previewPixels, MAX_RASTER } from '../raster.mjs';

test('preview uses exactly the packed black and white pixels, with zero row padding', () => {
    const pixels = Uint8ClampedArray.from([0, 255, 0, 255, 0, 255, 0, 255, 0].flatMap(n => [n, n, n, 255]));
    const bytes = packRaster(pixels, 9, 1);
    assert.deepEqual([...bytes], [0, 9, 0, 1, 0xaa, 0x80]);
    assert.deepEqual(previewPixels(bytes), pixels);
});

test('a composition beyond the receiver cap is rejected', () => {
    assert.throws(() => packRaster(new Uint8ClampedArray(0), 384, MAX_RASTER), RangeError);
});
