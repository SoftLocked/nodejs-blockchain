import net from 'node:net';

const HOST = '127.0.0.1'; // Localhost
const PORT = 8080;
let clientList = []

// Create a TCP server
const server = net.createServer((socket) => {
    console.log(`Client connected from ${socket.remoteAddress}:${socket.remotePort-1000}`);

    clientList.push(socket)

    

    // Handle incoming data from client
    socket.on('data', (data) => {

        clientList.forEach((client) => {
            if (client !== socket) {
                const [host, port] = data.toString().trim().split(":")
                client.write(`${host}:${port}`);
            }
        });

    });

    // Handle client disconnection
    socket.on('end', () => {
        clientList.splice(clientList.indexOf(socket), 1);
        console.log('Client disconnected');
    });

    // Handle errors
    socket.on('error', (err) => {
        console.error(`Error: ${err.message}`);
    });
});

// Start the server
server.listen({
    host:HOST,
    port:PORT,
    reuseAddr: true,
}, () => {
    console.log(`TCP server listening on ${HOST}:${PORT}`);
});