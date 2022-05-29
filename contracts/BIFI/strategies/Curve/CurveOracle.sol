// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../../infra/RabbityieldOracle/RabbityieldOracleHelper.sol";

interface ICurvePool {
    function price_oracle() external view returns (uint);
}

contract CurveOracle {
    ICurvePool public pool;
    address public token;
    address public baseToken;
    address public rabbityieldOracle;

    constructor(ICurvePool _pool, address _token, address _baseToken, address _rabbityieldOracle) {
        pool = _pool;
        token = _token;
        baseToken = _baseToken;
        rabbityieldOracle = _rabbityieldOracle;
    }

    function getPrice(bytes memory) public returns (uint256 price, bool success) {
        uint priceInBase = pool.price_oracle();
        price = RabbityieldOracleHelper.priceFromBaseToken(rabbityieldOracle, token, baseToken, priceInBase);
        return (price, true);
    }

    function validateData(bytes calldata data) external view {}
}