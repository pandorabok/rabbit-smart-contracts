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
