// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./RabbityieldWrapper.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

/**
 * @dev Interface of wrapper for initializing
 */
interface IWrapper {
  function initialize(address _vault, string memory _name, string memory _symbol) external;
}

/**
 * @title Rabbityield Wrapper ERC-4626 Factory
 * @author kexley
 * @notice Minimal factory for wrapping Rabbityield Vaults
 * @dev This factory creates lightweight ERC-4626 compliant wrappers for existing Rabbityield Vaults
 */
contract RabbityieldWrapperFactory {
  using ClonesUpgradeable for address;

  /**
   * @notice Immutable logic implementation address for a Rabbityield Vault wrapper
   */
  address public immutable implementation;

  /**
   * @dev Emitted when a new proxy is deployed
   */
  event ProxyCreated(address proxy);

  /**
   * @dev Deploys the instance of a wrapper and sets the implementation
   */
  constructor() {
    implementation = address(new RabbityieldWrapper());
  }

  /**
   * @notice Creates a new Rabbityield Vault wrapper
   * @dev Wrapper is initialized with "w" prepended to the vault name and symbol
   * @param _vault address of underlying Rabbityield Vault
   * @return proxy address of deployed wrapper
   */
  function clone(address _vault) external returns (address proxy) {
    proxy = implementation.clone();
    IWrapper(proxy).initialize(
      _vault,
      string.concat("W", IVault(_vault).name()),
      string.concat("w", IVault(_vault).symbol())
    );
    emit ProxyCreated(proxy);
  }
}
