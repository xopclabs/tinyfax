import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { encodeFixtureJob, fixtureRaster } from '../secure-job.mjs';

const text = value => new TextEncoder().encode(value);

test('a secure fixture publication can be verified and decrypted by its recipient', async () => {
    const { subtle } = crypto;
    const signing = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const recipient = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const ids = Array.from({ length: 5 }, (_, i) => new Uint8Array(16).fill(i + 1));
    const job = await encodeFixtureJob({ ids, issuedAt: 1700000000, signingKey: signing.privateKey, recipientKey: recipient.publicKey });
    assert.equal(job.length, 263);
    assert.equal(Buffer.from(job.slice(0, 4)).toString('hex'), '54464a01');
    assert.deepEqual(job.slice(4, 84), new Uint8Array(Buffer.concat(ids)));
    assert.equal(new DataView(job.buffer).getUint32(88), 1700000600);
    const signed = Buffer.concat([text('tinyfax/bench-job/v1/sign'), job.slice(0, -64)]);
    assert(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, signing.publicKey, job.slice(-64), signed));
    signed[signed.length - 1] ^= 1;
    assert.equal(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, signing.publicKey, job.slice(-64), signed), false);
    const peer = await subtle.importKey('raw', job.slice(92, 157), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const secret = await subtle.deriveBits({ name: 'ECDH', public: peer }, recipient.privateKey, 256);
    const base = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
    const nonce = job.slice(157, 169);
    const key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: nonce, info: text('tinyfax/bench-job/v1/aes-gcm') }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const raster = Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: job.slice(0, 171) }, key, job.slice(171, -64)));
    assert.equal(raster.subarray(0, 4).toString('hex'), '00080008');
    assert.equal(createHash('sha256').update(raster.subarray(4)).digest('hex'), 'eb266379c69a34280593fb2d4ea1f0293568650503cde89fc21d0b947447ecc4');
    assert.deepEqual(new Uint8Array(raster), fixtureRaster());
});
