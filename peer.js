const net = require("net");

let PORT = process.argv[2];
const peerList = [];

// Spin up server to start listening for connections
const server = net.createServer((socket) => {
    console.log(`Peer connected (${socket.remoteAddress}:${socket.remotePort})`);

    // Add connected peer to peer list
    peerList.push(socket);

    // Handle incoming messages
    socket.on("data", (data) => {
        console.log(`Recieved: ${data.toString().trim()}`);
        //broadcast(data, socket);
    })

    // Remove peer if disconnected
    socket.on("end", () => {
        peerList.splice(peerList.indexOf(socket), 1);
        console.log("Peer disconnected");
    });
});

// Listen for connections
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})

// Broadcast message to all connected peers except sender
/*
function broadcast(message, sender) {
    peerList.forEach((peer) => {
        if (peer !== sender) {
        peer.write(message);
        }
    });
}
*/

// Connect to other peers
function connectToPeer(host, port) {
    const socket = net.createConnection({host, port}, () => {
      console.log(`Connected to peer ${host}:${port}`);
      peerList.push(socket);
    });
  
    // Handle incoming messages from peer
    socket.on("data", (data) => {
      console.log(`Received: ${data.toString().trim()}`);
    });
  
    // Handle errors
    socket.on("error", (err) => {
      console.log(`Error connecting to peer: ${err.message}`);
    });
}

function connectToBootstrap(host, port) {
    const socket = net.createConnection({host, port}, () => {
        console.log(`Connected to bootstrap ${host}:${port}`);
    });

    socket.write(`0.0.0.0:${PORT}`)

    // Handle incoming messages from bootstrap
    socket.on("data", (data) => {
        const [host, port] = data.toString().trim().split(":");
        connectToPeer(host, parseInt(port, 10));
    });

    // Handle errors
    socket.on("error", (err) => {
        console.log(`Error connecting to bootstrap: ${err.message}`);
    });
}

connectToBootstrap("127.0.0.1", parseInt(8080, 10));

// CLI to send messages
process.stdin.on("data", (data) => {
broadcast(data, null);
});