import net from 'node:net';
import crypto from 'node:crypto';

import { Block, BlockChain } from './BlockChain.js';

let PORT = process.argv[2];
const peerList = [];

let chain = new BlockChain();

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

function signData(index, data, pk, sk) {
    return {
        content: data,
        public_key: pk.toString('utf-8'),
        signature: crypto.createSign('sha256')
                         .update(index+JSON.stringify(data))
                         .end()
                         .sign(sk, 'hex')
    }
}

// Spin up server to start listening for connections
const server = net.createServer((socket) => {
    console.log(`Peer connected (${socket.remoteAddress}:${socket.remotePort})`);

    // Add connected peer to peer list
    peerList.push(socket);

    // Handle incoming messages
    socket.on("data", (data) => {
        let tempChain = new BlockChain(JSON.parse(data.toString().trim()));
        if (BlockChain.isBlockChainValid(tempChain.chain) && tempChain.getWork() >= chain.getWork()) {
            chain = tempChain;
        }
        console.log(`Updated block chain: `, chain.displayChainMinimal(), chain.getWork());
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
      socket.write(JSON.stringify(chain.chain));
    });
  
    // Handle incoming messages from peer
    socket.on("data", (data) => {
        let tempChain = new BlockChain(JSON.parse(data.toString().trim()));
        if (BlockChain.isBlockChainValid(tempChain.chain) && tempChain.getWork() >= chain.getWork()) {
            chain = tempChain;
        }
        console.log(`Updated block chain: `, chain.displayChainMinimal(), chain.getWork());
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
    chain.addBlock(signData(chain.chain.length, data.toString().trim(), publicKey, privateKey))
    console.log(`Chain:`, chain.displayChainMinimal(), chain.getWork());
    peerList.forEach((peer) => {
        peer.write(JSON.stringify(chain.chain));
    });
});