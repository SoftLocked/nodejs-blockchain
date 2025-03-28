const crypto = require('crypto');

class Block {
    constructor(index, data, prevHash, timestamp=new Date().toISOString(), proofOfWork=null) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // Data JSON must have public key "public_key" and signature "signature" keys for verification
        this.prevHash = prevHash;

        this.proofOfWork = proofOfWork

        if (this.proofOfWork == null) {
            // TODO: Prove work here
        }

        this.hash = this.calcHash();
    }

    calcHash() {
        return crypto.createHash('sha256')
            .update(this.index + this.timestamp + JSON.stringify(this.data) + this.proofOfWork + this.prevHash)
            .digest('base64');
    }

    static isDataValid(index, data) {
        return crypto.createVerify('sha256').update(index+JSON.stringify(data.content)).end().verify(crypto.createPublicKey({
            key: data.public_key,
            format: 'pem',
            type: 'spki',
        }), data.signature, 'hex');
    }
}

class BlockChain {
    constructor(chain=[]) {
        let temp_bc = this.listToBlockChain(chain)
        //console.log(temp_bc)
        if (!chain) {
            this.chain = [this.createGenBlock()]
        } else if (!this.isBlockChainValid(temp_bc)) {
            this.chain = [this.createGenBlock()]
        } else {
            this.chain = temp_bc
        }
    }

    listToBlockChain(chain) {
        let res = [];
        for (let i = 0; i < chain.length; i++) {
            let block = new Block(chain[i].index, chain[i].data, chain[i].prevHash, chain[i].timestamp, chain[i].proofOfWork);
            res.push(block);
        }
        return res
    }

    createGenBlock() {
        return new Block(0, {}, "");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1]
    }

    addBlock(data) {
        if (!this.isBlockChainValid(this.chain)) {
            return false;
        }

        let block = new Block(this.chain.length, data, this.getLatestBlock().hash);

        if (!Block.isDataValid(this.chain.length, block.data)) {
            return false;
        }

        this.chain.push(block)
    }

    isBlockChainValid(chain) {
        if (chain.length < 1) {
            return false;
        }
        for (let i = 1; i < chain.length; i++) {
            if (chain[i].hash !== chain[i].calcHash()) {
                return false;
            }

            if (i > 0 && chain[i].prevHash != chain[i-1].hash) {
                return false;
            }


            if (!Block.isDataValid(i, chain[i].data)) {
                return false;
            }
        }
        return true;
    }
}

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

function displayChainMinimal(chain) {
    return chain.map((block) => {
        return block.data.content;
    });
}

let bc = new BlockChain()

//console.log(bc.chain)

bc.addBlock(signData(1, "Piece", publicKey, privateKey))

//console.log('test', bc.chain)

let temp = JSON.parse(JSON.stringify(bc.chain))

//console.log(temp)

new_bc = new BlockChain(temp)

new_bc.addBlock(signData(2, "Of Data!", publicKey, privateKey))

console.log(displayChainMinimal(new_bc.chain));


