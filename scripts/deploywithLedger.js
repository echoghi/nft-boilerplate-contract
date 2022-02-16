const hre = require('hardhat');
const { LedgerSigner } = require('@anders-t/ethers-ledger');

async function main() {
    const ledger = new LedgerSigner(hre.ethers.provider);
    // We get the contract to deploy
    const NFT = await hre.ethers.getContractFactory('SushiWorld');
    let contractFactory = await NFT.connect(ledger);
    const nft = await contractFactory.deploy();

    await nft.deployed();

    console.log('NFT deployed to:', nft.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// verify with:
// npx hardhat run verify [contract] --network rinkeby
