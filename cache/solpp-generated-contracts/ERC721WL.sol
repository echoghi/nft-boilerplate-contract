pragma solidity ^0.8.11;

// SPDX-License-Identifier: MIT



import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Ticketed.sol";

error SaleInactive();
error SoldOut();
error NoBots();
error InvalidPrice();
error InvalidQuantity();
error WithdrawFailed();

contract ERC721WL is ERC721, Ownable, Ticketed {
  using Strings for uint256;

  string public _baseTokenURI;
  
  uint256 public nextTokenId = 1;
  uint256 public constant maxSupply = 10;
  uint256 public price = 0.01 ether;
  uint256 public maxMintAmountPerTx = 5;

  bool public presaleActive = false;
  bool public publicSaleActive = false;

  constructor() ERC721("Test", "TEST") {
    _baseTokenURI = "ipfs://path_to_hidden_ipfs/";
  }

  function allowlistMint(bytes[] calldata _signatures, uint256[] calldata spotIds) public payable {
    uint256 _nextTokenId = nextTokenId;
    if (!presaleActive) revert SaleInactive();
    // offset by 1 because we start at 1, and nextTokenId is incremented _after_ mint
    if (_nextTokenId + (spotIds.length - 1) > maxSupply) revert SoldOut();
    if(msg.sender != tx.origin) revert NoBots();
    if (msg.value != price * spotIds.length) revert InvalidPrice();

    for (uint256 i = 0; i < spotIds.length; i++) {
      // invalidate the spotId passed in
      _claimAllowlistSpot(_signatures[i], spotIds[i]);
      _mint(msg.sender, _nextTokenId);
      
      unchecked {
        _nextTokenId++;
      }
    }

    nextTokenId = _nextTokenId;
  }

  function mint(uint256 _quantity) public payable {
    uint256 _nextTokenId = nextTokenId;
    if (!publicSaleActive) revert SaleInactive();
    // offset by 1 because we start at 1, and nextTokenId is incremented _after_ mint
    if (_nextTokenId + (_quantity - 1) > maxSupply) revert SoldOut();
    if(msg.sender != tx.origin) revert NoBots();
    if (msg.value != price * _quantity) revert InvalidPrice();

    for (uint256 i = 0; i < _quantity; i++) {
      _mint(msg.sender, _nextTokenId);
      
      unchecked {
        _nextTokenId++;
      }
    }

    nextTokenId = _nextTokenId;
  }

  function devMint(address receiver, uint256 _quantity) external onlyOwner {
    uint256 _nextTokenId = nextTokenId;
    if (_nextTokenId + (_quantity - 1) > maxSupply) revert SoldOut();

    for (uint256 i = 0; i < _quantity; i++) {
        _mint(receiver, _nextTokenId);

        unchecked {
            _nextTokenId++;
        }
    }
    nextTokenId = _nextTokenId;
  }

  function tokensOf(address wallet) public view returns (uint256[] memory) {
    uint256 supply = totalSupply();
    uint256[] memory tokenIds = new uint256[](balanceOf(wallet));

    uint256 currIndex = 0;
    for (uint256 i = 1; i <= supply; i++) {
        if (wallet == ownerOf(i)) tokenIds[currIndex++] = i;
    }

    return tokenIds;
  }

  function setPrice(uint256 _price) public onlyOwner {
    price = _price;
  }

  function setMaxMintAmountPerTx(uint256 _maxMintAmountPerTx) public onlyOwner {
    maxMintAmountPerTx = _maxMintAmountPerTx;
  }

  function setPresaleState(bool _state) public onlyOwner {
    presaleActive = _state;
  }

  function setPublicSaleState(bool _state) public onlyOwner {
    publicSaleActive = _state;
  }

  function totalSupply() public view virtual returns (uint256) {
    return nextTokenId - 1;
  }

  function setClaimGroups(uint256 num) external onlyOwner {
    _setClaimGroups(num);
  }

  function setSigner(address _signer) external onlyOwner {
    _setClaimSigner(_signer);
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