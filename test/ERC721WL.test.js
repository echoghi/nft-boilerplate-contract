const { expect, assert } = require('chai');
const fs = require('fs');
const basePath = process.cwd();
const { ethers } = require('hardhat');

const signatureJson = fs.readFileSync(`${basePath}/whitelist.json`, 'utf8');

const unrevealedArt = 'ipfs://path_to_hidden_ipfs/';
const revealedArt = 'ipfs://path_to_art_ipfs/';
const signer = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

let nftContract;
let contractOwner;
let testUser;
let testUser2;
let signatures;
let price;

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

    price = await nftContract.price();
});

describe('ERC-721 WL', function () {
    it('Should return the unrevealed ipfs uri upon deployment', async function () {
        expect(await nftContract._baseTokenURI()).to.equal(unrevealedArt);
    });

    it('Should mint allowlist', async function () {
        const unpauseTX = await nftContract.setPresaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const setSignerTX = await nftContract.setSigner(signer);

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
            .allowlistMint([first, second, third], [0, 1, 2], { value: ethers.utils.parseEther('0.03') });

        // wait until transaction is mined
        mintTX.wait();

        const fourth = signatures[testUser2.address][0].signature;
        const fifth = signatures[testUser2.address][1].signature;
        const sixth = signatures[testUser2.address][2].signature;

        const mintTX2 = await nftContract
            .connect(testUser2)
            .allowlistMint([fourth, fifth, sixth], [3, 4, 5], { value: ethers.utils.parseEther('0.03') });

        // wait until transaction is mined
        mintTX2.wait();

        expect(await nftContract.totalSupply()).to.equal(6);
    });

    it('Should enforce correct value when public minting', async function () {
        const unpauseTX = await nftContract.setPublicSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        let freeMint;

        try {
            // attempt mint with no value
            await nftContract.connect(testUser).mint(1, { value: 0 });

            freeMint = 'success';
        } catch (err) {
            freeMint = 'fail';
        }

        const firstMintValue = `${+convertBalance(price) * 1}`;

        const mintTX = await nftContract.connect(testUser).mint(1, { value: ethers.utils.parseEther(firstMintValue) });

        // wait until transaction is mined
        mintTX.wait();

        const secondMintValue = `${+convertBalance(price) * 3}`;

        const secondMintTX = await nftContract
            .connect(testUser)
            .mint(3, { value: ethers.utils.parseEther(secondMintValue) });

        // wait until transaction is mined
        secondMintTX.wait();

        assert.equal(freeMint, 'fail');
        expect(await nftContract.totalSupply()).to.equal(4);
    });

    it('Should devMint as owner + reject non-owner', async function () {
        let executed;

        try {
            // attempt dev mint with non-owner
            await nftContract.connect(testUser).devMint(testUser.address, 1, { value: 0 });
            executed = 'success';
        } catch (err) {
            executed = 'fail';
        }

        const mintTX = await nftContract.devMint(testUser.address, 4, { value: 0 });

        // wait until transaction is mined
        mintTX.wait();

        assert.equal(executed, 'fail');
        expect(await nftContract.totalSupply()).to.equal(4);
    });

    it('Should enforce correct mint qty per tx', async function () {
        const unpauseTX = await nftContract.setPublicSaleState(true);
        const maxMintAmountPerTx = await nftContract.maxMintAmountPerTx();

        // wait until transaction is mined
        unpauseTX.wait();

        let overMaxMint;
        let underMinMint;
        let invalidQuantityMint;

        try {
            // attempt mint with too many NFTs
            await nftContract.mint(maxMintAmountPerTx + 1, { value: 0 });
            overMaxMint = 'success';
        } catch (err) {
            overMaxMint = 'fail';
        }

        try {
            // attempt mint with zero NFTs
            await nftContract.mint(0, { value: 0 });
            underMinMint = 'success';
        } catch (err) {
            underMinMint = 'fail';
        }

        try {
            // attempt mint with negative NFTs
            await nftContract.mint(-1, { value: 0 });
            invalidQuantityMint = 'success';
        } catch (err) {
            invalidQuantityMint = 'fail';
        }

        const mintValue = `${+convertBalance(price) * 5}`;

        // attempt max mint
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther(mintValue) });

        // wait until transaction is mined
        mintTX.wait();

        assert.equal(overMaxMint, 'fail');
        assert.equal(underMinMint, 'fail');
        assert.equal(invalidQuantityMint, 'fail');
        expect(await nftContract.totalSupply()).to.equal(5);
    });

    it('Should not be revealed by default', async function () {
        const unpauseTX = await nftContract.setPublicSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        // attempt max mint as user
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther('0.05') });

        // wait until transaction is mined
        mintTX.wait();

        // query token uri for minted token
        const secondToken = await nftContract.tokenURI(2);

        expect(secondToken).to.equal(`${unrevealedArt}2`);
    });

    it('Sale states should be inactive by default', async function () {
        let executed;

        try {
            // attempt mint
            await nftContract.mint(1, { value: 0 });

            executed = 'success';
        } catch (err) {
            executed = 'fail';
        }

        assert.equal(executed, 'fail');
        expect(await nftContract.publicSaleActive()).to.equal(false);
        expect(await nftContract.presaleActive()).to.equal(false);
    });

    it('Should reveal correct uri after mint + ipfs update + reveal', async function () {
        const unpauseTX = await nftContract.setPublicSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const mintValue = `${+convertBalance(price) * 5}`;

        // attempt max mint as user
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther(mintValue) });

        // wait until transaction is mined
        mintTX.wait();

        // update ipfs uri to revealed art
        const setRevealTX = await nftContract.setBaseURI(revealedArt);

        // wait until transaction is mined
        setRevealTX.wait();

        // query token uri for minted token
        const secondToken = await nftContract.tokenURI(2);

        expect(secondToken).to.equal('ipfs://path_to_art_ipfs/2');
    });

    it('Should sell out', async function () {
        const unpauseTX = await nftContract.setPublicSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const mintTX = await nftContract.devMint(testUser.address, 10, { value: 0 });

        // wait until transaction is mined
        mintTX.wait();

        let executed;

        try {
            // attempt to mint more
            await nftContract.devMint(testUser.address, 1, { value: 0 });
            executed = 'success';
        } catch (err) {
            executed = 'fail';
        }

        assert.equal(executed, 'fail');
        expect(await nftContract.totalSupply()).to.equal(10);
    });
});
