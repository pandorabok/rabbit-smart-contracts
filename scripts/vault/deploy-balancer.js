import hardhat, { ethers, web3 } from "hardhat";
import { addressBook } from "blockchain-addressbook";
import { predictAddresses } from "../../utils/predictAddresses";

const {
  platforms: { velodrome, rabbityieldfinance },
  tokens: {
    WBTC: { address: WBTC },
    OP: {address: OP},
    ETH: { address: ETH },
    USDC: { address: USDC },
    DAI: { address: DAI },
  },
} = addressBook.optimism;

const vaultParams = {
  mooName: "Moo Aave Op USDC",
  mooSymbol: "mooAaveOpUSDC",
  delay: 21600,
};

const strategyParams = {
  dataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  incentivesController:"0x929EC64c34a17401F460460D4B9390518E5B473e",
  nativeToWantRoute: [[ETH, USDC, false]],
  outputToNativeRoute: [OP, ETH, false],
  unirouter: velodrome.router,
  keeper: rabbityieldfinance.keeper,
  strategist: process.env.STRATEGIST_ADDRESS,
