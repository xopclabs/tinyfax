const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const { join, dirname } = require('node:path');

const assets = new Map([
    ['/', ['text/html; charset=utf-8', join(__dirname, 'index.html')]],
    ['/sender.js', ['text/javascript', join(__dirname, 'sender.js')]],
    ['/workspace.css', ['text/css', join(__dirname, 'workspace.css')]],
    ['/composer.mjs', ['text/javascript', join(__dirname, 'composer.mjs')]],
    ['/raster.mjs', ['text/javascript', join(__dirname, 'raster.mjs')]],
    ['/secure-job.mjs', ['text/javascript', join(__dirname, 'secure-job.mjs')]],
    ['/mqtt.js', ['text/javascript', join(dirname(require.resolve('mqtt/package.json')), 'dist/mqtt.min.js')]],
]);

createServer((request, response) => {
    const asset = request.method === 'GET' && assets.get(request.url);
    if (!asset) {
        response.writeHead(404).end();
        return;
    }
    const [type, path] = asset;
    response.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src wss://mqtt.flespi.io; form-action 'none'; frame-ancestors 'none'",
    }).end(readFileSync(path));
}).listen(8080, '127.0.0.1', () => console.log('http://127.0.0.1:8080'));
