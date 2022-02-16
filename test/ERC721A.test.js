const { expect, assert } = require('chai');
const { ethers } = require('hardhat');

const unrevealedArt = 'ipfs://path_to_hidden_ipfs/hidden.json';
const revealedArt = 'ipfs://path_to_art_ipfs/';

let nftContract;
let contractOwner;
let testUser;

const convertBalance = (wei) => ethers.utils.formatEther(wei.toString());

beforeEach(async () => {
    const NFT = await ethers.getContractFactory('ERC721ATEST');
    const [owner, addr1] = await ethers.getSigners();

    contractOwner = owner;
    testUser = addr1;

    nftContract = await NFT.deploy();
    await nftContract.deployed();
});

describe('ERC721A', function () {
    it('Should return the unrevealed ipfs uri upon deployment', async function () {
        expect(await nftContract.hiddenMetadataUri()).to.equal(unrevealedArt);
    });

    it('Should be paused by default', async function () {
        expect(await nftContract.paused()).to.equal(true);
    });

    it('Should unpause', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        expect(await nftContract.paused()).to.equal(false);
    });

    it('Should mint when unpaused', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        const mintTX = await nftContract.mint(3, { value: 0 });

        // wait until transaction is mined
        mintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(3);
    });

    it('Should refund user if too much ETH is sent to mint', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        const initialBalance = await ethers.provider.getBalance(testUser.address);

        const mintTX = await nftContract.connect(testUser).mint(2, { value: ethers.utils.parseEther('3') });

        // wait until transaction is mined
        mintTX.wait();

        const finalBalance = await ethers.provider.getBalance(testUser.address);

        const ethSpent = convertBalance(initialBalance) - convertBalance(finalBalance);

        expect(ethSpent.toFixed(2)).to.equal('0.08');
    });

    it('Should enforce correct value when minting as non-owner', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        try {
            // attempt mint with no value
            await nftContract.connect(testUser).mint(1, { value: 0 });
            assert(false);
        } catch (err) {
            // check for error
            assert(err);
        }

        const mintTX = await nftContract.connect(testUser).mint(1, { value: ethers.utils.parseEther('0.04') });

        // wait until transaction is mined
        mintTX.wait();

        const secondMintTX = await nftContract.connect(testUser).mint(3, { value: ethers.utils.parseEther('0.12') });

        // wait until transaction is mined
        secondMintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(4);
    });

    it('Should enforce max mint cap', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        // await nftContract.setUriPrefix(revealedArt)

        try {
            // attempt mint with too many NFTs
            await nftContract.mint(6, { value: 0 });
            assert(false);
        } catch (err) {
            // check for error
            assert(err);
        }

        try {
            // attempt mint with zero NFTs
            await nftContract.mint(0, { value: 0 });
            assert(false);
        } catch (err) {
            // check for error
            assert(err);
        }

        try {
            // attempt mint with negative NFTs
            await nftContract.mint(-1, { value: 0 });
            assert(false);
        } catch (err) {
            // check for error
            assert(err);
        }

        // attempt max mint
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther('0.20') });

        // wait until transaction is mined
        mintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(5);
    });

    it('Should not be revealed by default', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        // attempt max mint as user
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther('0.20') });

        // wait until transaction is mined
        mintTX.wait();

        // query token uri for minted token
        const secondToken = await nftContract.tokenURI(2);

        expect(await nftContract.revealed()).to.equal(false);
        expect(secondToken).to.equal('ipfs://path_to_hidden_ipfs/hidden.json');
    });

    it('Should reveal correct uri after mint + ipfs update + reveal', async function () {
        const unpauseTX = await nftContract.setPaused(false);

        // wait until transaction is mined
        unpauseTX.wait();

        // attempt max mint as user
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther('0.20') });

        // wait until transaction is mined
        mintTX.wait();

        const setRevealTX = await nftContract.setUriPrefix(revealedArt);

        // wait until transaction is mined
        setRevealTX.wait();

        const revealTX = await nftContract.setRevealed(true);

        // wait until transaction is mined
        revealTX.wait();

        // query token uri for minted token
        const secondToken = await nftContract.tokenURI(2);

        expect(secondToken).to.equal('ipfs://path_to_art_ipfs/2.json');
    });
});
