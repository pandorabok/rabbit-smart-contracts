// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin-4/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin-4/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/gmx/IGMXRouter.sol";
import "../../interfaces/gmx/IGMXTracker.sol";
import "../../interfaces/gmx/IRabbityieldVault.sol";
import "../../interfaces/gmx/IGMXStrategy.sol";
import "../../interfaces/gmx/IGMXGovToken.sol";
import "../../interfaces/rabbityield/IRabbityieldSwapper.sol";
import "../Common/StratFeeManagerInitializable.sol";

contract StrategyGMX is StratFeeManagerInitializable {
    using SafeERC20 for IERC20;

    // Tokens used
    address public native;
    address public want;

    // Third party contracts
    address public chef;
    address public rewardStorage;
    address public balanceTracker;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 callFees, uint256 rabbityieldFees, uint256 strategistFees);

    function initialize(
        address _chef,
        address _native,
        CommonAddresses calldata _commonAddresses
    ) external initializer {
        __StratFeeManager_init(_commonAddresses);
        chef = _chef;
        native = _native;

        want = IGMXRouter(chef).gmx();
        rewardStorage = IGMXRouter(chef).feeGmxTracker();
        balanceTracker = IGMXRouter(chef).stakedGmxTracker();

        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal > 0) {
            IGMXRouter(chef).stakeGmx(wantBal);
            emit Deposit(balanceOf());
        }
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = IERC20(want).balanceOf(address(this));

        if (wantBal < _amount) {
            IGMXRouter(chef).unstakeGmx(_amount - wantBal);
            wantBal = IERC20(want).balanceOf(address(this));
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        if (tx.origin != owner() && !paused()) {
            uint256 withdrawalFeeAmount = wantBal * withdrawalFee / WITHDRAWAL_MAX;
            wantBal = wantBal - withdrawalFeeAmount;
        }

        IERC20(want).safeTransfer(vault, wantBal);

        emit Withdraw(balanceOf());
    }

    function beforeDeposit() external virtual override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest(tx.origin);
        }
    }

    function harvest() external virtual {
        _harvest(tx.origin);
    }

    function harvest(address callFeeRecipient) external virtual {
        _harvest(callFeeRecipient);
    }

    function managerHarvest() external onlyManager {
        _harvest(tx.origin);
    }

    // compounds earnings and charges performance fee
    function _harvest(address callFeeRecipient) internal whenNotPaused {
        IGMXRouter(chef).handleRewards(true, false, true, true, true, true, false);
        _swapRewardToNative();
        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        if (nativeBal > 0) {
            chargeFees(callFeeRecipient);
            _swapNativeToWant();
            uint256 wantHarvested = balanceOfWant();
            deposit();

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    function _swapRewardToNative() internal {
        uint256 wantBal = IERC20(want).balanceOf(address(this));
        if (wantBal > 0) IRabbityieldSwapper(unirouter).swap(want, native, wantBal);
    }

    function _swapNativeToWant() internal {
        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        if (nativeBal > 0) IRabbityieldSwapper(unirouter).swap(native, want, nativeBal);
    }

    // performance fees
    function chargeFees(address callFeeRecipient) internal {
        IFeeConfig.FeeCategory memory fees = getFees();
        uint256 feeBal = IERC20(native).balanceOf(address(this)) * fees.total / DIVISOR;

        uint256 callFeeAmount = feeBal * fees.call / DIVISOR;
        IERC20(native).safeTransfer(callFeeRecipient, callFeeAmount);

        uint256 rabbityieldFeeAmount = feeBal * fees.rabbityield / DIVISOR;
        IERC20(native).safeTransfer(rabbityieldFeeRecipient, rabbityieldFeeAmount);

        uint256 strategistFeeAmount = feeBal * fees.strategist / DIVISOR;
        IERC20(native).safeTransfer(strategist, strategistFeeAmount);

        emit ChargedFees(callFeeAmount, rabbityieldFeeAmount, strategistFeeAmount);
    }

    // calculate the total underlaying 'want' held by the strat.
    function balanceOf() public view returns (uint256) {
        return balanceOfWant() + balanceOfPool();
    }

    // it calculates how much 'want' this contract holds.
    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    // it calculates how much 'want' the strategy has working in the farm.
    function balanceOfPool() public view returns (uint256) {
        return IGMXTracker(balanceTracker).depositBalances(address(this), want);
    }

    // returns rewards unharvested
    function rewardsAvailable() public view returns (uint256) {
        return IGMXTracker(rewardStorage).claimable(address(this));
    }

    // native reward amount for calling harvest
    function callReward() public view returns (uint256) {
        IFeeConfig.FeeCategory memory fees = getFees();
        uint256 nativeBal = rewardsAvailable();

        return nativeBal * fees.total / DIVISOR * fees.call / DIVISOR;
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) external onlyManager {
        harvestOnDeposit = _harvestOnDeposit;

        if (harvestOnDeposit) {
            setWithdrawalFee(0);
        } else {
            setWithdrawalFee(10);
        }
    }

    // called as part of strat migration. Sends all the available funds back to the vault.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        IRabbityieldVault.StratCandidate memory candidate = IRabbityieldVault(vault).stratCandidate();
        address stratAddress = candidate.implementation;

        IERC20(rewardStorage).safeApprove(stratAddress, type(uint).max);
        IGMXRouter(chef).signalTransfer(stratAddress);
        IGMXStrategy(stratAddress).acceptTransfer();

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
        IGMXRouter(chef).unstakeGmx(balanceOfPool());
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();

        deposit();
    }

    function _giveAllowances() internal {
        IERC20(want).safeApprove(balanceTracker, type(uint).max);
        IERC20(native).safeApprove(unirouter, type(uint).max);
        IERC20(want).safeApprove(unirouter, type(uint).max);
    }

    function _removeAllowances() internal {
        IERC20(want).safeApprove(balanceTracker, 0);
        IERC20(native).safeApprove(unirouter, 0);
        IERC20(want).safeApprove(unirouter, 0);
    }

    function acceptTransfer() external {
        address prevStrat = IRabbityieldVault(vault).strategy();
        require(msg.sender == prevStrat, "!prevStrat");
        IGMXRouter(chef).acceptTransfer(prevStrat);
    }

    function setChef(address _chef) external onlyOwner {
        chef = _chef;
    }

    function delegate(address _token, address _delegatee) external onlyManager {
        IGMXGovToken(_token).delegate(_delegatee);
    }
}
