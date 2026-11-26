import { packRaster, previewPixels, MAX_RASTER } from './raster.mjs';

export const PAPER_WIDTH = 384;
const LIMIT = 8192;
export function textLines(ctx, element) {
    ctx.font = `${element.size}px ${element.font}`;
    return element.text.split('\n').flatMap(paragraph => {
        const lines = [''];
        for (const ch of paragraph) {
            const i = lines.length - 1;
            if (lines[i] && ctx.measureText(lines[i] + ch).width > element.width) lines.push(ch);
            else lines[i] += ch;
        }
        return lines;
    });
}
export function elementHeight(ctx, item) {
    return item.image ? item.height : textLines(ctx, item).length * Math.ceil(item.size * 1.25);
}
export function renderPaper(canvas, items) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const height = Math.max(1, ...items.map(item => item.y + elementHeight(ctx, item)));
    if (height > LIMIT) throw new RangeError('Paper is too long to preview. Shorten the draft.');
    canvas.width = PAPER_WIDTH;
    canvas.height = height;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PAPER_WIDTH, height);
    for (const item of items) {
        if (item.image) ctx.drawImage(item.image, item.x, item.y, item.width, item.height);
        else {
            const lines = textLines(ctx, item);
            ctx.fillStyle = item.color;
            ctx.textAlign = item.align;
            ctx.textBaseline = 'top';
            const x = item.x + (item.align === 'center' ? item.width / 2 : item.align === 'right' ? item.width : 0);
            lines.forEach((line, index) => ctx.fillText(line, x, item.y + index * Math.ceil(item.size * 1.25), item.width));
        }
    }
    const bytes = packRaster(ctx.getImageData(0, 0, PAPER_WIDTH, height).data, PAPER_WIDTH, height, Infinity);
    ctx.putImageData(new ImageData(previewPixels(bytes), PAPER_WIDTH, height), 0, 0);
    return { bytes, sendable: items.length > 0 && bytes.length <= MAX_RASTER };
}
