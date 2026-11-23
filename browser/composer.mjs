import { encodeFixtureJob } from './secure-job.mjs';
import { composeRaster, previewPixels } from './raster.mjs';
import { getSigningPair, requestResult } from './sender.js';

const get = id => document.getElementById(id);
const base = 'tinyfax-test/secure-v1';
const sender = '01' + '00'.repeat(15);
const signer = '03' + '00'.repeat(15);
const fromHex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
const validId = value => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
const recipients = new Map();
let credential, raster, revision = 0, sending = false;

const selection = new Set();
const narrow = matchMedia('(max-width: 799px)');
let multi = false;
function canSend() {
    get('send-compose').disabled = sending || !raster || !selection.size;
    get('targets').textContent = [...selection].map(id => recipients.get(id).name).join(', ');
    get('open-paper').hidden = !narrow.matches || !multi;
    get('open-paper').disabled = !selection.size;
    get('open-paper').textContent = `Open Paper for ${selection.size}`;
    for (const button of get('recipient').children) button.setAttribute('aria-pressed', selection.has(button.dataset.id));
}
function toggle(id) {
    if (selection.has(id)) selection.delete(id);
    else selection.add(id);
    canSend();
}
function openPaper() { get('workspace').classList.add('paper-open'); get('back').focus(); }
function personButton(id, name) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.dataset.id = id;
    let timer, held = false, start;
    const cancel = () => clearTimeout(timer);
    button.addEventListener('pointerdown', event => {
        held = false;
        if (!narrow.matches || !event.isPrimary || event.button !== 0) return;
        start = [event.clientX, event.clientY];
        timer = setTimeout(() => { held = multi = true; selection.add(id); canSend(); }, 500);
    });
    button.addEventListener('pointermove', event => {
        if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 10) cancel();
    });
    for (const event of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(event, cancel);
    button.addEventListener('contextmenu', event => { if (narrow.matches) event.preventDefault(); });
    button.addEventListener('click', () => {
        if (held) { held = false; return; }
        if (!narrow.matches || multi) toggle(id);
        else { selection.clear(); selection.add(id); canSend(); openPaper(); }
    });
    return button;
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
    const status = get('people-status');
    get('save-sender').disabled = true;
    selection.clear();
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
            get('recipient').append(personButton(id, entry.name));
        }
        get('settings-status').textContent = 'Sender credential saved.';
        status.textContent = list.size ? 'Choose a recipient and add content.' : 'No usable recipients are available.';
    } catch (error) {
        get('settings-status').textContent = status.textContent = error.message;
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
    canSend();
    const text = get('text').value.trim();
    const file = get('image').files[0];
    if (!text && !file) return;
    let image;
    try {
        if (file) image = await createImageBitmap(file);
        const packed = composeRaster(text, image);
        if (revision !== current) return;
        const fields = new DataView(packed.buffer);
        preview.width = fields.getUint16(0);
        preview.height = fields.getUint16(2);
        preview.getContext('2d').putImageData(new ImageData(previewPixels(packed), preview.width, preview.height), 0, 0);
        preview.hidden = false;
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
    else get('settings-status').textContent = 'Enter the scoped sender token.';
});
get('open-paper').addEventListener('click', openPaper);
get('back').addEventListener('click', () => {
    multi = false;
    selection.clear();
    get('workspace').classList.remove('paper-open');
    canSend();
    get('recipient').firstElementChild?.focus();
});
narrow.addEventListener('change', () => { multi = false; canSend(); });
function route() {
    const settings = location.hash === '#settings';
    get('settings').hidden = !settings;
    get('workspace').hidden = settings;
}
window.addEventListener('hashchange', route);
route();
get('mode').addEventListener('change', () => {
    const image = get('mode').value === 'Image';
    get('text').value = get('image').value = '';
    get('text-field').hidden = image;
    get('image-field').hidden = !image;
    get('compose-status').textContent = '';
    void updatePreview();
});
get('text').addEventListener('input', updatePreview);
get('image').addEventListener('change', updatePreview);
get('send-compose').addEventListener('click', async () => {
    if (sending || !selection.size || !credential || !raster) return;
    const snapshot = [...selection].map(id => [id, recipients.get(id)]);
    const packed = raster;
    const secret = credential;
    const status = get('compose-status');
    sending = true;
    canSend();
    status.textContent = 'Sending…';
    const results = await Promise.all(snapshot.map(async ([recipient, entry]) => {
        try {
            const id = crypto.randomUUID().replaceAll('-', '');
            const publication = await encodeFixtureJob({
                ids: [sender, recipient, signer, entry.keyId, id].map(fromHex),
                issuedAt: Math.floor(Date.now() / 1000), signingKey: (await getSigningPair()).privateKey,
                recipientKey: entry.key, raster: packed,
            });
            await withBroker(secret, client => client.publishAsync(`${base}/inbox/${recipient}/from/${sender}`, publication, { qos: 1, retain: false }));
            return [entry.name, true];
        } catch { return [entry.name, false]; }
    }));
    const names = confirmed => results.filter(([, ok]) => ok === confirmed).map(([name]) => name).join(', ');
    status.textContent = [names(true) && `Broker acknowledged: ${names(true)}.`, names(false) && `Could not confirm: ${names(false)}.`].filter(Boolean).join(' ');
    sending = false;
    canSend();
});

useCredential().then(saved => {
    if (saved) void loadRecipients(saved);
    else get('people-status').textContent = 'Set up this browser in Settings.';
}).catch(() => { get('people-status').textContent = 'Could not restore the sender credential.'; });
