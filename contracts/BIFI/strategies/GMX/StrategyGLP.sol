// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin-4/contracts/token/ERC20/utils/SafeERC20.sol";

import "../../interfaces/gmx/IGMXRouter.sol";
import "../../interfaces/gmx/IGMXTracker.sol";
import "../../interfaces/gmx/IGLPManager.sol";
import "../../interfaces/gmx/IRabbityieldVault.sol";
import "../../interfaces/gmx/IGMXStrategy.sol";
import "../../interfaces/gmx/IGMXGovToken.sol";
import "../../interfaces/rabbityield/IRabbityieldSwapper.sol";
import "../Common/StratFeeManagerInitializable.sol";

contract StrategyGLP is StratFeeManagerInitializable {
    using SafeERC20 for IERC20;

    // Tokens used
    address public want;
    address public native;
    address public gmx;

    // Third party contracts
    address public minter;
    address public chef;
    address public glpRewardStorage;
    address public gmxRewardStorage;
    address public glpManager;

    bool public harvestOnDeposit;
    uint256 public lastHarvest;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 callFees, uint256 rabbityieldFees, uint256 strategistFees);

    function initialize(
        address _want,
        address _native,
        address _minter,
        address _chef,
        CommonAddresses calldata _commonAddresses
    ) public initializer {
        __StratFeeManager_init(_commonAddresses);
        want = _want;
        native = _native;
        minter = _minter;
        chef = _chef;

        gmx = IGMXRouter(chef).gmx();
        glpRewardStorage = IGMXRouter(chef).feeGlpTracker();
        gmxRewardStorage = IGMXRouter(chef).feeGmxTracker();
        glpManager = IGMXRouter(minter).glpManager();

        _giveAllowances();
    }

    // puts the funds to work
    function deposit() public whenNotPaused {
        emit Deposit(balanceOf());
    }

    function withdraw(uint256 _amount) external {
        require(msg.sender == vault, "!vault");

        uint256 wantBal = balanceOfWant();

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
        _swapRewards();
        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        if (nativeBal > 0) {
            chargeFees(callFeeRecipient);
            uint256 before = balanceOfWant();
            mintGlp();
            uint256 wantHarvested = balanceOfWant() - before;

            lastHarvest = block.timestamp;
            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    function _swapRewards() internal {
        uint256 gmxBal = IERC20(gmx).balanceOf(address(this));
        if (gmxBal > 0) IRabbityieldSwapper(unirouter).swap(gmx, native, gmxBal);
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

    // mint more GLP with the ETH earned as fees
    function mintGlp() internal {
        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        IGMXRouter(minter).mintAndStakeGlp(native, nativeBal, 0, 0);
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
    function balanceOfPool() public pure returns (uint256) {
        return 0;
    }

    // returns rewards unharvested
    function rewardsAvailable() public view returns (uint256) {
        uint256 rewardGLP = IGMXTracker(glpRewardStorage).claimable(address(this));
        uint256 rewardGMX = IGMXTracker(gmxRewardStorage).claimable(address(this));
        return rewardGLP + rewardGMX;
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

    // called as part of strat migration. Transfers all want, GLP, esGMX and MP to new strat.
    function retireStrat() external {
        require(msg.sender == vault, "!vault");

        IRabbityieldVault.StratCandidate memory candidate = IRabbityieldVault(vault).stratCandidate();
        address stratAddress = candidate.implementation;

        IERC20(gmxRewardStorage).safeApprove(stratAddress, type(uint).max);
        IGMXRouter(chef).signalTransfer(stratAddress);
        IGMXStrategy(stratAddress).acceptTransfer();

        uint256 wantBal = IERC20(want).balanceOf(address(this));
        IERC20(want).transfer(vault, wantBal);
    }

    // pauses deposits and withdraws all funds from third party systems.
    function panic() public onlyManager {
        pause();
    }

    function pause() public onlyManager {
        _pause();

        _removeAllowances();
    }

    function unpause() external onlyManager {
        _unpause();

        _giveAllowances();
    }

    function _giveAllowances() internal {
        IERC20(native).safeApprove(glpManager, type(uint).max);
        IERC20(gmx).safeApprove(unirouter, type(uint).max);
    }

    function _removeAllowances() internal {
        IERC20(native).safeApprove(glpManager, 0);
        IERC20(gmx).safeApprove(unirouter, 0);
    }

    function acceptTransfer() external {
        address prevStrat = IRabbityieldVault(vault).strategy();
        require(msg.sender == prevStrat, "!prevStrat");
        IGMXRouter(chef).acceptTransfer(prevStrat);

        // send back 1 wei to complete upgrade
        IERC20(want).safeTransfer(prevStrat, 1);
    }

    function setChef(address _chef) external onlyOwner {
        chef = _chef;
    }

    function delegate(address _token, address _delegatee) external onlyManager {
        IGMXGovToken(_token).delegate(_delegatee);
    }
}
