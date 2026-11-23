import { encodeFixtureJob } from './secure-job.mjs';

const token = document.querySelector('#token');
const send = document.querySelector('#send');
const status = document.querySelector('#status');
const inbox = 'tinyfax-test/inbox/bob/from/alice';
const payload = 'tinyfax transport test';

const secureSend = document.querySelector('#secure-send');
const receiverKey = document.querySelector('#receiver-key');
const keyOutput = document.querySelector('#signing-key');
let signingPair;

export function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadSigningPair() {
    const open = indexedDB.open('tinyfax-bench', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('keys');
    const db = await requestResult(open);
    try {
        const stored = await requestResult(db.transaction('keys').objectStore('keys').get('signer'));
        if (stored) return stored;
        const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
        const tx = db.transaction('keys', 'readwrite');
        const committed = new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onabort = () => reject(tx.error);
        });
        tx.objectStore('keys').add(pair, 'signer');
        await committed;
        return pair;
    } finally {
        db.close();
    }
}

export function getSigningPair() {
    return signingPair ??= loadSigningPair().catch(error => {
        signingPair = undefined;
        throw error;
    });
}

const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const fromHex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));
const benchId = n => Uint8Array.of(n, ...new Uint8Array(15));

document.querySelector('#signer').addEventListener('click', async () => {
    try {
        const pair = await getSigningPair();
        keyOutput.textContent = hex(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
    } catch {
        keyOutput.textContent = 'Could not load the browser signing key.';
    }
});

async function directoryRecipient(client) {
    const base = 'tinyfax-test/secure-v1';
    const member = hex(benchId(2));
    const members = `${base}/members`;
    const encryption = `${base}/encryption/${member}`;
    let approved, record, timer, onMessage;
    try {
        const ready = new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error('Directory lookup timed out')), 5000);
            onMessage = (topic, payload, packet) => {
                if (!packet.retain || payload.length > 960) return;
                try {
                    const data = JSON.parse(new TextDecoder().decode(payload));
                    if (topic === members && Array.isArray(data.members)) approved = data.members.includes(member);
                    if (topic === encryption && /^[0-9a-f]{32}$/.test(data.id) && /^04[0-9a-f]{128}$/.test(data.key)) record = data;
                    if (approved === false) reject(new Error('Recipient is not in directory'));
                    if (approved && record) resolve(record);
                } catch {
                    reject(new Error('Invalid directory record'));
                }
            };
            client.on('message', onMessage);
        });
        const [result] = await Promise.all([ready, client.subscribeAsync([members, encryption], { qos: 1 })]);
        return result;
    } finally {
        clearTimeout(timer);
        client.off('message', onMessage);
    }
}

async function publish(secure) {
    if (!token.value) {
        status.textContent = 'Enter the scoped sender token.';
        return;
    }
    send.disabled = secureSend.disabled = true;
    const uuid = crypto.randomUUID();
    const id = secure ? uuid.replaceAll('-', '') : uuid;
    status.textContent = `Sending ${id}…`;
    let client;
    let timer;
    try {
        const useDirectory = secure && document.querySelector('#directory').checked;
        if (secure && !useDirectory && !/^04[0-9a-f]{128}$/i.test(receiverKey.value.trim())) {
            status.textContent = 'Enter the receiver public key as 130 hex characters.';
            return;
        }
        client = mqtt.connect('wss://mqtt.flespi.io/mqtt', {
            protocolVersion: 5,
            username: token.value,
            clean: true,
            properties: { sessionExpiryInterval: 0 },
            connectTimeout: 8000,
            reconnectPeriod: 0,
        });
        await Promise.race([
            new Promise((resolve, reject) => {
                client.on('error', reject);
                client.once('connect', resolve);
            }).then(async () => {
                let message = `${id} ${payload}`;
                if (secure) {
                    const record = useDirectory ? await directoryRecipient(client) : { id: hex(benchId(4)), key: receiverKey.value.trim() };
                    const recipientKey = await crypto.subtle.importKey('raw', fromHex(record.key), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
                    const signingKey = (await getSigningPair()).privateKey;
                    message = await encodeFixtureJob({
                        ids: [benchId(1), benchId(2), benchId(3), fromHex(record.id), fromHex(id)],
                        issuedAt: Math.floor(Date.now() / 1000), signingKey, recipientKey,
                    });
                }
                return client.publishAsync(inbox, message, { qos: 1, retain: false });
            }),
            new Promise((_, reject) => { timer = setTimeout(reject, 12000); }),
        ]);
        status.textContent = `Broker acknowledged ${id}. Check the ESP32 log for device receipt.`;
    } catch {
        status.textContent = `No broker acknowledgment confirmed for ${id}.`;
    } finally {
        clearTimeout(timer);
        client?.end(true);
        send.disabled = secureSend.disabled = false;
    }
}

send.addEventListener('click', () => publish(false));
secureSend.addEventListener('click', () => publish(true));
