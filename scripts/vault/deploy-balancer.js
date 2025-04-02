import hardhat, { ethers, web3 } from "hardhat";
import { addressBook } from "blockchain-addressbook";
import { predictAddresses } from "../../utils/predictAddresses";

const {
  platforms: { velodrome, rabbityieldfinance },
  tokens: {
    WBTC: { address: WBTC },
    OP: {address: OP},
