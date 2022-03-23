const { expect, assert } = require('chai');
const { ethers } = require('hardhat');

const unrevealedArt = 'ipfs://path_to_hidden_ipfs/';
const revealedArt = 'ipfs://path_to_art_ipfs/';

let nftContract;
let contractOwner;
let testUser;
let price;

const convertBalance = (wei) => ethers.utils.formatEther(wei.toString());

beforeEach(async () => {
    const NFT = await ethers.getContractFactory('ERC721ATEST');
    const [owner, addr1] = await ethers.getSigners();

    contractOwner = owner;
    testUser = addr1;

    nftContract = await NFT.deploy();
    await nftContract.deployed();

    price = await nftContract.price();
});

describe('ERC721A', function () {
    it('Should return the unrevealed ipfs uri upon deployment', async function () {
        expect(await nftContract._baseTokenURI()).to.equal(unrevealedArt);
    });

    it('Should be paused by default', async function () {
        expect(await nftContract.saleActive()).to.equal(false);
    });

    it('Should unpause', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        expect(await nftContract.saleActive()).to.equal(true);
    });

    it('Should mint when unpaused', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const mintValue = `${+convertBalance(price) * 3}`;

        const mintTX = await nftContract.mint(3, { value: ethers.utils.parseEther(mintValue) });

        // wait until transaction is mined
        mintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(3);
    });

    it('Should devMint as owner + reject non-owner', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        try {
            // attempt mint with no value
            await nftContract.connect(testUser).devMint(testUser.address, 1, { value: 0 });
            assert(false);
        } catch (err) {
            // check for error
            assert(err);
        }

        const mintTX = await nftContract.devMint(testUser.address, 4, { value: 0 });

        // wait until transaction is mined
        mintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(4);
    });

    it('Should enforce max mint cap', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        // await nftContract.setUriPrefix(revealedArt)

        const mintValue = `${+convertBalance(price) * 6}`;

        try {
            // attempt mint with too many NFTs
            await nftContract.mint(6, { value: ethers.utils.parseEther(mintValue) });
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

        const maxMintValue = `${+convertBalance(price) * 5}`;

        // attempt max mint
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther(maxMintValue) });

        // wait until transaction is mined
        mintTX.wait();

        expect(await nftContract.totalSupply()).to.equal(5);
    });

    it('Should not be revealed by default', async function () {
        const unpauseTX = await nftContract.setSaleState(true);

        // wait until transaction is mined
        unpauseTX.wait();

        const mintValue = `${+convertBalance(price) * 5}`;

        // attempt max mint as user
        const mintTX = await nftContract.connect(testUser).mint(5, { value: ethers.utils.parseEther(mintValue) });

        // wait until transaction is mined
        mintTX.wait();

        // query token uri for minted token
        const secondToken = await nftContract.tokenURI(2);

        expect(secondToken).to.equal('ipfs://path_to_hidden_ipfs/2');
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

        const setRevealTX = await nftContract.setBaseURI(revealedArt);

        // wait until transaction is mined
        setRevealTX.wait();

        // query token uri for minted token
        const secondToken = await nftContract.tokenURI(2);

        expect(secondToken).to.equal('ipfs://path_to_art_ipfs/2');
    });
});
