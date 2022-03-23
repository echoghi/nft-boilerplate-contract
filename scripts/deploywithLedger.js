const hre = require('hardhat');

async function main() {
    // eth-provider is a simple EIP-1193 provider
    const ethProvider = require('eth-provider');
    // Connect to Frame
    const frame = ethProvider('frame');

    // We get the contract to deploy
    const NFT = await hre.ethers.getContractFactory('Passages');
    const tx = await NFT.getDeployTransaction();

    // Set `tx.from` to current Frame account
    tx.from = (await frame.request({ method: 'eth_requestAccounts' }))[1];

    // Sign and send the transaction using Frame
    const hash = await frame.request({ method: 'eth_sendTransaction', params: [tx] });

    console.log('NFT contract tx:', hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message);
        process.exit(1);
    });

// verify with:
// npx hardhat run verify [contract] --network rinkeby
