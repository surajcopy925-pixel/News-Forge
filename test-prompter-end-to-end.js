const net = require('net');
const http = require('http');

const RUNDOWN_ID = 'RD-MO0NQ4H4';

async function runTest() {
    console.log('--- Prompter End-to-End Test ---');

    // 1. Connect a simulated WinPlus
    const client = new net.Socket();
    
    await new Promise((resolve) => {
        client.connect(10541, '127.0.0.1', () => {
            console.log('[WinPlus Sim] Connected to News Forge');
            resolve();
        });
    });

    let roCreateReceived = false;

    client.on('data', (data) => {
        const msg = data.toString();
        // console.log('[WinPlus Sim] Received:', msg);
        
        if (msg.includes('<roCreate>')) {
            console.log('[WinPlus Sim] SUCCESS: Received <roCreate> message!');
            roCreateReceived = true;
        }
    });

    // 2. Call the Send API via HTTP
    console.log('[Test] Triggering Send to Prompter API...');
    const postData = JSON.stringify({ rundownId: RUNDOWN_ID });
    
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/prompter/send',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('[API Response]', body);
                resolve();
            });
        });
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });

    // Wait a bit for the TCP message to arrive
    setTimeout(() => {
        if (roCreateReceived) {
            console.log('--- TEST PASSED ---');
        } else {
            console.log('--- TEST FAILED: roCreate not received ---');
        }
        client.destroy();
        process.exit(roCreateReceived ? 0 : 1);
    }, 2000);
}

runTest().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
