const hardhat = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { addressBook } = require("blockchain-addressbook");

const ethers = hardhat.ethers;

const chain = "cronos";

const config = {
  rabt: addressBook[chain].tokens.RABT.address,
  wNative: addressBook[chain].tokens.WNATIVE.address,
  treasury: addressBook[chain].platforms.rabbityieldfinance.treasury,
  rewardPool: addressBook[chain].platforms.rabbityieldfinance.rewardPool,
  unirouter: ethers.constants.AddressZero,
};

async function main() {
  await hardhat.run("compile");

  const [signer] = await ethers.getSigners();
  const provider = signer.provider;

  const RabbityieldFeeBatch = await ethers.getContractFactory("RabbityieldFeeBatchV2");
  const batcher = await upgrades.deployProxy(RabbityieldFeeBatch, [
    config.rabt,
    config.wNative,
    config.treasury,
    config.rewardPool,
    config.unirouter,
  ]);

  await batcher.deployed();

  const implementationAddr = await getImplementationAddress(provider, batcher.address);

  console.log(`Deployed proxy at ${batcher.address}`);
  console.log(`Deployed implementation at ${implementationAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
