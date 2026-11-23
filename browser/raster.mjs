export const MAX_RASTER = 4096;
export const WIDTH = 256;

export function packRaster(pixels, width, height) {
    const stride = Math.ceil(width / 8);
    const length = 4 + stride * height;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width > 65535 || height > 65535 || length > MAX_RASTER || pixels.length !== width * height * 4) {
        throw new RangeError('Composition exceeds the raster limit. Shorten the text or choose a shorter image.');
    }
    const raster = new Uint8Array(length);
    const header = new DataView(raster.buffer);
    header.setUint16(0, width);
    header.setUint16(2, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const gray = (pixels[offset] * 299 + pixels[offset + 1] * 587 + pixels[offset + 2] * 114) / 1000;
        if (gray < 128) raster[4 + y * stride + (x >> 3)] |= 128 >> (x & 7);
    }
    return raster;
}

export function previewPixels(raster) {
    const header = new DataView(raster.buffer, raster.byteOffset, raster.byteLength);
    const width = header.getUint16(0), height = header.getUint16(2);
    const stride = Math.ceil(width / 8);
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const gray = raster[4 + y * stride + (x >> 3)] & (128 >> (x & 7)) ? 0 : 255;
        pixels.set([gray, gray, gray, 255], (y * width + x) * 4);
    }
    return pixels;
}

export function composeRaster(text, image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const font = '16px sans-serif';
    ctx.font = font;
    const lines = [];
    for (const paragraph of (text ? text.split('\n') : [])) {
        let line = '';
        for (const char of paragraph) {
            if (line && ctx.measureText(line + char).width > WIDTH - 16) {
                lines.push(line);
                line = '';
            }
            line += char;
        }
        lines.push(line);
    }
    const textHeight = lines.length ? lines.length * 20 + 16 : 0;
    const maxHeight = Math.floor((MAX_RASTER - 4) / (WIDTH / 8));
    if (textHeight >= maxHeight || (!text && !image)) throw new RangeError('Add content within the raster limit.');
    const scale = image ? Math.min(1, WIDTH / image.width, (maxHeight - textHeight) / image.height) : 0;
    const imageHeight = image ? Math.max(1, Math.floor(image.height * scale)) : 0;
    canvas.width = WIDTH;
    canvas.height = textHeight + imageHeight;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = font;
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';
    lines.forEach((line, index) => ctx.fillText(line, 8, 8 + 20 * index));
    if (image) {
        const w = Math.max(1, Math.floor(image.width * scale));
        ctx.drawImage(image, Math.floor((WIDTH - w) / 2), textHeight, w, imageHeight);
    }
    return packRaster(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
}
