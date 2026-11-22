const token = document.querySelector('#token');
const send = document.querySelector('#send');
const status = document.querySelector('#status');
const inbox = 'tinyfax-test/inbox/bob/from/alice';
const payload = 'tinyfax transport test';

send.addEventListener('click', async () => {
    if (!token.value) {
        status.textContent = 'Enter the scoped sender token.';
        return;
    }
    send.disabled = true;
    const id = crypto.randomUUID();
    status.textContent = `Sending ${id}…`;
    let client;
    let timer;
    try {
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
            }).then(() => client.publishAsync(inbox, `${id} ${payload}`, { qos: 1, retain: false })),
            new Promise((_, reject) => { timer = setTimeout(reject, 12000); }),
        ]);
        status.textContent = `Broker acknowledged ${id}. Check the ESP32 log for device receipt.`;
    } catch {
        status.textContent = `No broker acknowledgment confirmed for ${id}.`;
    } finally {
        clearTimeout(timer);
        client?.end(true);
        send.disabled = false;
    }
});
