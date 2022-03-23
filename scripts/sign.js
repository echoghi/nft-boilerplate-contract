const { ethers } = require('hardhat');
const fs = require('fs');
const basePath = process.cwd();
const buildDir = `${basePath}`;

const whitelist = [
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2'
];

// Sign an array of whitelist addresses for use with ERC-721WL
async function main() {
    // eth-provider is a simple EIP-1193 provider
    // const ethProvider = require('eth-provider');
    // // Connect to Frame
    // const frame = ethProvider('frame');

    // const tx = {
    //     from: '',
    //     to: null,
    //     data: whitelist[0],
    //     value: 0,
    //     gasLimit: '21000',
    //     maxFeePerGas: '300',
    //     maxPriorityFeePerGas: '10'
    // };

    // tx.from = (await frame.request({ method: 'eth_requestAccounts' }))[1];

    // // Sign and send the transaction using Frame
    // const hash = await frame.request({ method: 'eth_signTransaction', params: [tx] });

    // console.log(hash);

    if (fs.existsSync(`${buildDir}/whitelist.json`)) {
        fs.rmSync(`${buildDir}/whitelist.json`, { recursive: true });
    }

    const [owner] = await ethers.getSigners();
    let signatures = {};
    let spotId = 0;
    const spots = 3;
    console.log('owner', owner.address);

    for (let addy of whitelist) {
        let sigs = [];

        for (let i = 0; i < spots; i++) {
            // hash
            const payloadHash = ethers.utils.solidityKeccak256(['address', 'uint256'], [addy, spotId]);
            // sign message
            const signature = await owner.signMessage(ethers.utils.arrayify(payloadHash));

            sigs.push({ signature, spotId });
            spotId++;
        }

        signatures[addy] = sigs;
    }

    fs.writeFileSync(`${buildDir}/whitelist.json`, JSON.stringify(signatures, null, 2));
    console.log('Signatures Written > `./whitelist.json`');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
