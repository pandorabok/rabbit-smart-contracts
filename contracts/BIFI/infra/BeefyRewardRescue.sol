// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "@openzeppelin-4/contracts/token/ERC20/ERC20.sol";
import "../interfaces/rabbityield/IRabbityieldSwapper.sol";

contract RabbityieldRewardRescue {
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }

    struct BatchSwapStep {
        bytes32 poolId;
        uint256 assetInIndex;
        uint256 assetOutIndex;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }

    struct JoinPoolRequest {
        address[] assets;
        uint256[] maxAmountsIn;
        bytes userData;
        bool fromInternalBalance;
    }

    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    IRabbityieldSwapper public rabbityieldSwapper = IRabbityieldSwapper(0x0000830DF56616D58976A12D19d283B40e25BEEF);
    IERC20 public silo = IERC20(0x6f80310CA7F2C654691D1383149Fa1A57d8AB1f8);
    IERC20 public native = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    constructor() {
        silo.approve(address(rabbityieldSwapper), type(uint).max);
    }

    function batchSwap(
        SwapKind,
        BatchSwapStep[] memory swaps,
        address[] memory,
        FundManagement memory,
        int256[] memory,
        uint256
    ) external returns (int256[] memory) {
        uint256 amount = swaps[0].amount;
        silo.transferFrom(msg.sender, address(this), amount);
        rabbityieldSwapper.swap(address(silo), address(native), amount);
        uint bal = native.balanceOf(address(this));
        native.transfer(msg.sender, bal);
        
        int256[] memory deltas = new int256[](1);
        deltas[0] = int256(bal);
        return deltas;
    }
}