// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./RabbityieldVaultV7.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

// Rabbityield Finance Vault V7 Proxy Factory
// Minimal proxy pattern for creating new Rabbityield vaults
contract RabbityieldVaultV7Factory {
  using ClonesUpgradeable for address;

  // Contract template for deploying proxied Rabbityield vaults
  RabbityieldVaultV7 public instance;

  event ProxyCreated(address proxy);

  // Initializes the Factory with an instance of the Rabbityield Vault V7
  constructor(address _instance) {
    if (_instance == address(0)) {
      instance = new RabbityieldVaultV7();
    } else {
      instance = RabbityieldVaultV7(_instance);
    }
  }

  // Creates a new Rabbityield Vault V7 as a proxy of the template instance
  // A reference to the new proxied Rabbityield Vault V7
  function cloneVault() external returns (RabbityieldVaultV7) {
    return RabbityieldVaultV7(cloneContract(address(instance)));
  }

  // Deploys and returns the address of a clone that mimics the behaviour of `implementation`
  function cloneContract(address implementation) public returns (address) {
    address proxy = implementation.clone();
    emit ProxyCreated(proxy);
    return proxy;
  }
}