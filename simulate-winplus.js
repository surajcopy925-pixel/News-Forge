const net = require('net');

const client = new net.Socket();
client.connect(10541, '127.0.0.1', () => {
    console.log('Connected to simulation server');
    // Send a heartbeat
    client.write('<mos><mosID>PROMPTER</mosID><ncsID>NEWSFORGE</ncsID><heartbeat></heartbeat></mos>');
});

client.on('data', (data) => {
    console.log('Received: ' + data);
});

client.on('close', () => {
    console.log('Connection closed');
});

setTimeout(() => {
    console.log('Closing connection');
    client.destroy();
}, 5000);
