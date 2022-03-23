const { expect, assert } = require('chai');
const fs = require('fs');
const basePath = process.cwd();
const { ethers } = require('hardhat');

const signatureJson = fs.readFileSync(`${basePath}/whitelist.json`, 'utf8');

const unrevealedArt = 'ipfs://path_to_hidden_ipfs/hidden.json';
const revealedArt = 'ipfs://path_to_art_ipfs/';

let nftContract;
let contractOwner;
let testUser;
let testUser2;
let signatures;

const convertBalance = (wei) => ethers.utils.formatEther(wei.toString());

beforeEach(async () => {
    const NFT = await ethers.getContractFactory('ERC721WL');
    const [owner, addr1, addr2] = await ethers.getSigners();

    contractOwner = owner;
    testUser = addr1;
    testUser2 = addr2;

    signatures = JSON.parse(signatureJson);

    nftContract = await NFT.deploy();
    await nftContract.deployed();
});

describe('ERC721 WL', function () {
    it('should mint allowlist', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const setSignerTX = await nftContract.setSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');

        // wait until transaction is mined
        setSignerTX.wait();

        const setGroupsTX = await nftContract.setClaimGroups(10000);

        // wait until transaction is mined
        setGroupsTX.wait();

        const first = signatures[testUser.address][0].signature;
        const second = signatures[testUser.address][1].signature;
        const third = signatures[testUser.address][2].signature;

        const mintTX = await nftContract
            .connect(testUser)
            .mint([first, second, third], [0, 1, 2], { value: ethers.utils.parseEther('0.03') });

        // wait until transaction is mined
        mintTX.wait();

        const fourth = signatures[testUser2.address][0].signature;
        const fifth = signatures[testUser2.address][1].signature;
        const sixth = signatures[testUser2.address][2].signature;

        const mintTX2 = await nftContract
            .connect(testUser2)
            .mint([fourth, fifth, sixth], [3, 4, 5], { value: ethers.utils.parseEther('0.03') });

        // wait until transaction is mined
        mintTX2.wait();

        expect(await nftContract.totalSupply()).to.equal(6);
    });
});
