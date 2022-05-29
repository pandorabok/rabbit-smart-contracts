// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../../infra/RabbityieldOracle/RabbityieldOracleHelper.sol";
import "@openzeppelin-4/contracts/interfaces/IERC4626.sol";

contract ERC4626Oracle {

    IERC4626 public vault;
    address public rabbityieldOracle;

    constructor(IERC4626 _vault, address _rabbityieldOracle) {
        vault = _vault;
        rabbityieldOracle = _rabbityieldOracle;
    }

    function getPrice(bytes memory) public returns (uint256 price, bool success) {
        address asset = vault.asset();
        uint amountOut = vault.convertToShares(10 ** vault.decimals());
        price = RabbityieldOracleHelper.priceFromBaseToken(rabbityieldOracle, address(vault), asset, amountOut);
        return (price, true);
    }

    function validateData(bytes calldata data) external view {}
}