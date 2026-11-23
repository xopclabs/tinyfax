import { MAX_RASTER } from './raster.mjs';

const encoder = new TextEncoder();
const aesInfo = encoder.encode('tinyfax/bench-job/v1/aes-gcm');
const signatureDomain = encoder.encode('tinyfax/bench-job/v1/sign');

function join(...parts) {
    const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return result;
}

export function fixtureRaster() {
    return Uint8Array.of(0, 8, 0, 8, 0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81);
}

export async function encodeFixtureJob({ ids, issuedAt, signingKey, recipientKey, raster = fixtureRaster() }) {
    if (ids.length !== 5 || ids.some(id => !(id instanceof Uint8Array) || id.length !== 16)) {
        throw new TypeError('Expected five 16-byte identifiers');
    }
    if (!Number.isInteger(issuedAt) || issuedAt < 0 || issuedAt > 0xffffffff - 600) {
        throw new RangeError('Invalid job issuance time');
    }
    const { subtle } = crypto;
    if (!(raster instanceof Uint8Array) || raster.length < 4 || raster.length > MAX_RASTER) {
        throw new RangeError('Raster outside bench payload bounds');
    }
    const ephemeral = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const header = new Uint8Array(171);
    header.set([0x54, 0x46, 0x4a, 1]);
    header.set(join(...ids), 4);
    const fields = new DataView(header.buffer);
    fields.setUint32(84, issuedAt);
    fields.setUint32(88, issuedAt + 600);
    header.set(new Uint8Array(await subtle.exportKey('raw', ephemeral.publicKey)), 92);
    header.set(nonce, 157);
    fields.setUint16(169, raster.length);
    const secret = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: recipientKey }, ephemeral.privateKey, 256));
    let base;
    try {
        base = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
    } finally {
        secret.fill(0);
    }
    const key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: nonce, info: aesInfo }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const encrypted = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: header }, key, raster));
    const body = join(header, encrypted);
    const signature = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, join(signatureDomain, body)));
    return join(body, signature);
}
