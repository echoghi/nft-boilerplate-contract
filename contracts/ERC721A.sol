// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error SaleInactive();
error SoldOut();
error NoBots();
error InvalidPrice();
error InvalidQuantity();
error WithdrawFailed();

contract ERC721ATEST is Ownable, ERC721A, ReentrancyGuard {
  using Strings for uint256;

  string public _baseTokenURI;
  
  uint256 public price = 0.01 ether;
  uint256 public constant maxSupply = 9999;
  uint256 public maxMintAmountPerTx = 5;

  bool public saleActive = false;

  constructor() ERC721A("NFT Name", "TOKEN") {
    _baseTokenURI = "ipfs://path_to_hidden_ipfs/";
  }

  function mint(uint256 _quantity) external payable {
    if (!saleActive) revert SaleInactive();
    if(_quantity < 1 || _quantity > maxMintAmountPerTx) revert InvalidQuantity();
    // offset by 1 because we start at 1, and nextTokenId is incremented _after_ mint
    if (totalSupply() + _quantity > maxSupply) revert SoldOut();
    if(msg.sender != tx.origin) revert NoBots();
    if (msg.value != price * _quantity) revert InvalidPrice();

    _safeMint(msg.sender, _quantity);
  }

  function devMint(address receiver, uint256 _quantity) external onlyOwner {
    if (totalSupply() + _quantity > maxSupply) revert InvalidQuantity();

    _safeMint(receiver, _quantity);
  }

  function getOwnershipData(uint256 tokenId)
    external
    view
    returns (TokenOwnership memory)
  {
    return ownershipOf(tokenId);
  }

  function tokenURI(uint256 _tokenId)
    public
    view
    virtual
    override
    returns (string memory)
  {
    require(
      _exists(_tokenId),
      "ERC721Metadata: URI query for nonexistent token"
    );

    string memory currentBaseURI = _baseURI();
    return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, _tokenId.toString()))
        : "";
  }

  function setPrice(uint256 _price) public onlyOwner {
    price = _price;
  }

  function setMaxMintAmountPerTx(uint256 _maxMintAmountPerTx) public onlyOwner {
    maxMintAmountPerTx = _maxMintAmountPerTx;
  }

  function setSaleState(bool _state) public onlyOwner {
    saleActive = _state;
  }

  function withdraw() public payable onlyOwner {
    (bool os, ) = payable(owner()).call{value: address(this).balance}("");
    if(!os) revert WithdrawFailed();
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  function setBaseURI(string memory baseURI) external onlyOwner {
    _baseTokenURI = baseURI;
  }
}