import { encodeFixtureJob } from './secure-job.mjs';
import { composeRaster, previewPixels } from './raster.mjs';
import { getSigningPair, requestResult } from './sender.js';

const get = id => document.getElementById(id);
const base = 'tinyfax-test/secure-v1';
const sender = '01' + '00'.repeat(15);
const signer = '03' + '00'.repeat(15);
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
const validId = value => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
const recipients = new Map();
let credential, raster, revision = 0, sending = false;

function canSend() {
    get('send-compose').disabled = sending || !raster || !recipients.has(get('recipient').value);
}

async function useCredential(value) {
    const opening = indexedDB.open('tinyfax-sender', 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore('settings');
    const db = await requestResult(opening);
    try {
        if (value === undefined) return await requestResult(db.transaction('settings').objectStore('settings').get('credential'));
        const tx = db.transaction('settings', 'readwrite');
        const done = new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error);
        });
        tx.objectStore('settings').put(value, 'credential');
        await done;
    } finally {
        db.close();
    }
}

async function withBroker(secret, operation) {
    const c = mqtt.connect('wss://mqtt.flespi.io/mqtt', {
        protocolVersion: 5, username: secret, clean: true, reconnectPeriod: 0, connectTimeout: 7000,
    });
    let timer;
    try {
        return await Promise.race([
            new Promise((resolve, reject) => {
                c.on('error', reject);
                c.once('connect', resolve);
            }).then(() => operation(c)),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Broker request timed out.')), 12000); }),
        ]);
    } finally {
        clearTimeout(timer);
        c.end(true);
    }
}

async function retained(client, topics, waitForAll) {
    if (!topics.length) return new Map();
    const records = new Map(), expected = new Set(topics);
    let handler, timer;
    try {
        const deliveries = new Promise(resolve => {
            timer = setTimeout(resolve, waitForAll ? 3000 : 1500);
            handler = (topic, bytes, packet) => {
                if (!packet.retain || !expected.has(topic) || bytes.length > 4096) return;
                try { records.set(topic, JSON.parse(new TextDecoder().decode(bytes))); }
                catch { records.set(topic, null); }
                if (records.size === expected.size) resolve();
            };
            client.on('message', handler);
        });
        await Promise.all([client.subscribeAsync(topics, { qos: 1 }), deliveries]);
        return records;
    } finally {
        clearTimeout(timer);
        client.off('message', handler);
    }
}

async function loadRecipients(secret) {
    const status = get('compose-status');
    get('save-sender').disabled = true;
    recipients.clear();
    get('recipient').replaceChildren();
    canSend();
    status.textContent = 'Loading recipients…';
    try {
        await getSigningPair();
        const list = await withBroker(secret, async client => {
            const topic = `${base}/members`;
            const { members } = (await retained(client, [topic], true)).get(topic) ?? {};
            if (!Array.isArray(members) || members.length > 20) throw new Error('Member directory unavailable.');
            const resolved = new Map();
            const ids = new Map(members.map(member => [typeof member === 'string' ? member : member?.id, member?.name]));
            const candidates = [...ids].filter(([id]) => validId(id) && id !== sender);
            const topics = candidates.map(([id]) => `${base}/encryption/${id}`);
            const keys = new Map();
            for (let offset = 0; offset < topics.length; offset += 8) {
                for (const entry of await retained(client, topics.slice(offset, offset + 8), false)) keys.set(...entry);
            }
            for (const [id, name] of candidates) {
                const record = keys.get(`${base}/encryption/${id}`);
                if (!validId(record?.id) || !/^04[0-9a-f]{128}$/.test(record.key)) continue;
                try {
                    const key = await crypto.subtle.importKey('raw', fromHex(record.key), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
                    resolved.set(id, { key, keyId: record.id, name: typeof name === 'string' && name ? name : id });
                } catch { /* An invalid curve point is not a usable key. */ }
            }
            return resolved;
        });
        await useCredential(secret);
        credential = secret;
        get('token').value = '';
        for (const [id, entry] of list) {
            recipients.set(id, entry);
            get('recipient').add(new Option(entry.name, id));
        }
        status.textContent = list.size ? 'Choose a recipient and add content.' : 'No usable recipients are available.';
    } catch (error) {
        status.textContent = error.message;
    } finally {
        get('save-sender').disabled = false;
        canSend();
    }
}

async function updatePreview() {
    const current = ++revision;
    const preview = get('preview');
    const status = get('compose-status');
    raster = undefined;
    preview.hidden = true;
    get('raster-hash').textContent = '';
    canSend();
    const text = get('text').value.trim();
    const file = get('image').files[0];
    if (!text && !file) return;
    let image;
    try {
        if (file) image = await createImageBitmap(file);
        const packed = composeRaster(text, image);
        const digest = await crypto.subtle.digest('SHA-256', packed.subarray(4));
        if (revision !== current) return;
        const fields = new DataView(packed.buffer);
        preview.width = fields.getUint16(0);
        preview.height = fields.getUint16(2);
        preview.getContext('2d').putImageData(new ImageData(previewPixels(packed), preview.width, preview.height), 0, 0);
        preview.hidden = false;
        get('raster-hash').textContent = hex(new Uint8Array(digest));
        raster = packed;
        status.textContent = '';
    } catch (error) {
        if (revision === current) status.textContent = error.message;
    } finally {
        image?.close();
        canSend();
    }
}

get('save-sender').addEventListener('click', () => {
    const value = get('token').value.trim() || credential;
    if (value) void loadRecipients(value);
    else get('compose-status').textContent = 'Enter the scoped sender token.';
});
get('recipient').addEventListener('change', canSend);
get('text').addEventListener('input', updatePreview);
get('image').addEventListener('change', updatePreview);
get('send-compose').addEventListener('click', async () => {
    const recipient = get('recipient').value;
    const entry = recipients.get(recipient);
    if (sending || !entry || !credential || !raster) return;
    const packed = raster;
    const id = crypto.randomUUID().replaceAll('-', '');
    const status = get('compose-status');
    sending = true;
    canSend();
    status.textContent = `Sending ${id}…`;
    try {
        const publication = await encodeFixtureJob({
            ids: [sender, recipient, signer, entry.keyId, id].map(fromHex),
            issuedAt: Math.floor(Date.now() / 1000), signingKey: (await getSigningPair()).privateKey,
            recipientKey: entry.key, raster: packed,
        });
        await withBroker(credential, client => client.publishAsync(`${base}/inbox/${recipient}/from/${sender}`, publication, { qos: 1, retain: false }));
        status.textContent = `Broker acknowledged ${id}. Check the ESP32 log for job acceptance.`;
    } catch {
        status.textContent = `No broker acknowledgment confirmed for ${id}.`;
    } finally {
        sending = false;
        canSend();
    }
});

useCredential().then(saved => {
    if (saved) void loadRecipients(saved);
}).catch(() => { get('compose-status').textContent = 'Could not restore the sender credential.'; });
