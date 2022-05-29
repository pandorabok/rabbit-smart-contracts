const hardhat = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
import { addressBook } from "blockchain-addressbook";

const ethers = hardhat.ethers;

const {
  platforms: { rabbityieldfinance },
  tokens: {
    USDC: { address: USDC },
    ETH: { address: ETH }
  },
} = addressBook.ethereum;

const RABT = '0x5870700f1272a1AdbB87C3140bD770880a95e55D';

const rabtRoute = ethers.utils.formatBytes32String("0");
const stableRoute = ethers.utils.solidityPack(["address", "uint24", "address"], [ETH, 500, USDC])

const addressZero = ethers.constants.AddressZero,

const config = {
  treasury: rabbityieldfinance.treasuryMultisig,
  rewardPool: '0xF49c523F08B4e7c8E51a44088ea2a5e6b5f397D9',
  unirouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564', //vvs.router,
  rabt: RABT,
  wNative: ETH,
  stable: USDC,
  rabtRoute: rabtRoute,
  stableRoute: stableRoute,
  splitTreasury: false,
  treasuryFee: 640
};

async function main() {

  await hardhat.run("compile");

  const deployer = await ethers.getSigner();
  const provider = deployer.provider;

  const RabbityieldFeeBatch = await ethers.getContractFactory("RabbityieldFeeBatchV3UniV3");

  const batcher = await upgrades.deployProxy(RabbityieldFeeBatch,  [
    config.rabt,
    config.wNative,
    config.stable,
    config.treasury,
    config.rewardPool,
    config.unirouter,
    config.rabtRoute, 
    config.stableRoute, 
    config.splitTreasury,
    config.treasuryFee
  ]
 );
  await batcher.deployed();

  const implementationAddr = await getImplementationAddress(provider, batcher.address);
  console.log("Deployed to:", batcher.address);
  console.log(`Deployed implementation at ${implementationAddr}`);

 
  console.log(`Verifing implementation`);
  await hardhat.run("verify:verify", {
    address: implementationAddr,
    constructorArguments: [
    ]
  })
}



main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
