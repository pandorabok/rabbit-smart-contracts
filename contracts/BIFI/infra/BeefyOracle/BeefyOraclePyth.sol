// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IPyth } from "../../interfaces/oracle/IPyth.sol";
import { RabbityieldOracleHelper, RabbityieldOracleErrors } from "./RabbityieldOracleHelper.sol";

/// @title Rabbityield Oracle using Pyth
/// @author Rabbityield, @kexley
/// @notice On-chain oracle using Pyth
library RabbityieldOraclePyth {

    /// @notice Fetch price from the Pyth feed and scale to 18 decimals
    /// @param _data Payload from the central oracle with the address of the Pyth feed
    /// @return price Retrieved price from the Pyth feed
    /// @return success Successful price fetch or not
    function getPrice(bytes calldata _data) external view returns (uint256 price, bool success) {
        (address pyth, bytes32 priceId) = abi.decode(_data, (address, bytes32));
        try IPyth(pyth).getPriceUnsafe(priceId) returns (IPyth.Price memory priceData) {
            price = RabbityieldOracleHelper.scaleAmount(uint256(uint64(priceData.price)), uint8(uint32(-1 * priceData.expo)));
            success = true;
        } catch {}
    }

    /// @notice Data validation for new oracle data being added to central oracle
    /// @param _data Encoded Pyth feed address
    function validateData(bytes calldata _data) external view {
        (address pyth, bytes32 priceId) = abi.decode(_data, (address, bytes32));
        try IPyth(pyth).getPriceUnsafe(priceId) returns (IPyth.Price memory) {
        } catch { revert RabbityieldOracleErrors.NoAnswer(); }
    }
}
