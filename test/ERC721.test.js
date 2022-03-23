const { expect, assert } = require('chai');
const { ethers } = require('hardhat');

const unrevealedArt = 'ipfs://path_to_unrevealed_ipfs/';
const revealedArt = 'ipfs://path_to_art_ipfs/';

let nftContract;
let contractOwner;
let testUser;
let price;

const convertBalance = (wei) => ethers.utils.formatEther(wei.toString());

beforeEach(async () => {
    const NFT = await ethers.getContractFactory('ERC721TEST');
    const [owner, addr1] = await ethers.getSigners();

    contractOwner = owner;
    testUser = addr1;

    nftContract = await NFT.deploy();
    await nftContract.deployed();

    price = await nftContract.price();
});

describe('ERC-721', function () {
    it('Should return the unrevealed ipfs uri upon deployment', async function () {
        expect(await nftContract._baseTokenURI()).to.equal(unrevealedArt);
    });

    it('Sale should be inactive by default', async function () {
        let executed;

        try {
            // attempt mint
            await nftContract.mint(1, { value: 0 });

            executed = 'success';
        } catch (err) {
            executed = 'fail';
        }

        assert.equal(executed, 'fail');
        expect(await nftContract.saleActive()).to.equal(false);
    });

    it('Should mint when sale is active', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const mintValue = `${+convertBalance(price) * 3}`;

        const mintTX = await nftContract.mint(3, { value: ethers.utils.parseEther(mintValue) });

        // wait until transaction is mined
        mintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(3);
    });

    it('Should enforce correct value when public minting', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

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
        const unpauseTX = await nftContract.setSaleState(true);
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
        const unpauseTX = await nftContract.setSaleState(true);

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

    it('Should reveal correct uri after mint + ipfs update + reveal', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

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
        const unpauseTX = await nftContract.setSaleState(true);

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
