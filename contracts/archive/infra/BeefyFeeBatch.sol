// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../interfaces/common/IUniswapRouterETH.sol";

contract RabbityieldFeeBatch is Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    address public wNative ;
    address public rabt;

    address public treasury;
    address public rewardPool;
    address public unirouter;

    // Fee constants
    uint constant public TREASURY_FEE = 140;
    uint constant public REWARD_POOL_FEE = 860;
    uint constant public MAX_FEE = 1000;

    address[] public wNativeToRabtRoute;

    constructor(
        address _treasury, 
        address _rewardPool, 
        address _unirouter, 
        address _rabt, 
        address _wNative 
    ) public {
        treasury = _treasury;
        rewardPool = _rewardPool;
        unirouter = _unirouter;
        rabt = _rabt;
        wNative  = _wNative ;

        wNativeToRabtRoute = [wNative, rabt];

        IERC20(wNative).safeApprove(unirouter, uint256(-1));
    }

    event NewRewardPool(address oldRewardPool, address newRewardPool);
    event NewTreasury(address oldTreasury, address newTreasury);
    event NewUnirouter(address oldUnirouter, address newUnirouter);
    event NewRabtRoute(address[] oldRoute, address[] newRoute);

    // Main function. Divides Rabbityield's profits.
    function harvest() public {
        uint256 wNativeBal = IERC20(wNative).balanceOf(address(this));

        uint256 treasuryHalf = wNativeBal.mul(TREASURY_FEE).div(MAX_FEE).div(2);
        IERC20(wNative).safeTransfer(treasury, treasuryHalf);
        IUniswapRouterETH(unirouter).swapExactTokensForTokens(treasuryHalf, 0, wNativeToRabtRoute, treasury, now);
        
        uint256 rewardsFeeAmount = wNativeBal.mul(REWARD_POOL_FEE).div(MAX_FEE);
        IERC20(wNative).safeTransfer(rewardPool, rewardsFeeAmount);
    }

    // Manage the contract
    function setRewardPool(address _rewardPool) external onlyOwner {
        emit NewRewardPool(rewardPool, _rewardPool);
        rewardPool = _rewardPool;
    }

    function setTreasury(address _treasury) external onlyOwner {
        emit NewTreasury(treasury, _treasury);
        treasury = _treasury;
    }

    function setUnirouter(address _unirouter) external onlyOwner {
        emit NewUnirouter(unirouter, _unirouter);

        IERC20(wNative).safeApprove(_unirouter, uint256(-1));
        IERC20(wNative).safeApprove(unirouter, 0);

        unirouter = _unirouter;
    }

    function setNativeToRabtRoute(address[] memory _route) external onlyOwner {
        require(_route[0] == wNative);
        require(_route[_route.length - 1] == rabt);

        emit NewRabtRoute(wNativeToRabtRoute, _route);
        wNativeToRabtRoute = _route;
    }
    
    // Rescue locked funds sent by mistake
    function inCaseTokensGetStuck(address _token) external onlyOwner {
        require(_token != wNative, "!safe");

        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, amount);
    }
}