import crypto from 'node:crypto';

export class Block {
    constructor(index, data, prevHash, timestamp=new Date().toISOString(), proofOfWork=null) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data; // Data JSON must have public key "public_key" and signature "signature" keys for verification
        this.prevHash = prevHash;

        this.proofOfWork = proofOfWork

        this.difficulty = 3;

        this.hash = this.calcHash();

        if (this.proofOfWork == null) {
            this.proofOfWork = 0;
            this.mineBlock();
        }

        
    }

    calcHash() {
        return crypto.createHash('sha256')
            .update(this.index + this.timestamp + JSON.stringify(this.data) + this.proofOfWork + this.prevHash)
            .digest('base64');
    }

    mineBlock() {
        console.log(`Mining with difficulty ${this.difficulty} (first ${this.difficulty*6} bits of hash must be 0)...`)
        const target = '0'.repeat(this.difficulty);
        while (this.hash.substring(0, this.difficulty) !== target) {
            //console.log('mining...');
            this.proofOfWork++;
            this.hash = this.calcHash();
        }
        console.log(`Block mined: ${this.hash} (proofOfWork: ${this.proofOfWork})`);
    }

    isBlockMined() {
        return this.hash.substring(0, this.difficulty) === '0'.repeat(this.difficulty);
    }

    static isDataValid(index, data) {
        return crypto.createVerify('sha256').update(index+JSON.stringify(data.content)).end().verify(crypto.createPublicKey({
            key: data.public_key,
            format: 'pem',
            type: 'spki',
        }), data.signature, 'hex');
    }
}

export class BlockChain {
    constructor(chain=[]) {
        let temp_bc = this.listToBlockChain(chain)
        //console.log(temp_bc)
        if (!chain) {
            this.chain = [this.createGenBlock()]
        } else if (!BlockChain.isBlockChainValid(temp_bc)) {
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
        if (!BlockChain.isBlockChainValid(this.chain)) {
            return false;
        }

        let block = new Block(this.chain.length, data, this.getLatestBlock().hash);

        if (!Block.isDataValid(this.chain.length, block.data)) {
            return false;
        }

        this.chain.push(block)
    }

    static isBlockChainValid(chain) {
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

            if (!chain[i].isBlockMined) {
                return false;
            }
        }
        return true;
    }

    getWork() {
        let work = 0;
        for (let i = 1; i < this.chain.length; i++) {
            work += this.chain[i].proofOfWork;
        }
        return work;
    }

    copyChain() {
        return new BlockChain(JSON.parse(JSON.stringify(this.chain)))
    }

    displayChainMinimal() {
        return this.chain.map((block) => {
            return block.data.content;
        });
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


