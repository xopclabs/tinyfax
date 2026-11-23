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

document.querySelector('#signer').addEventListener('click', async () => {
    try {
        const pair = await getSigningPair();
        document.querySelector("#signing-key").textContent = hex(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
    } catch {
        document.querySelector("#signing-key").textContent = 'Could not load the browser signing key.';
    }
});
