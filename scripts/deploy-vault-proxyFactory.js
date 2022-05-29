const hardhat = require("hardhat");

const ethers = hardhat.ethers;

async function main() {
  await hardhat.run("compile");

  const RabbityieldVaultV7ProxyFactory = await ethers.getContractFactory("RabbityieldVaultV7ProxyFactory");

  console.log("Deploying: RabbityieldVaultV7ProxyFactory");

  const rabbityieldVaultV7ProxyFactory = await RabbityieldVaultV7ProxyFactory.deploy();
  await rabbityieldVaultV7ProxyFactory.deployed();

  console.log("RabbityieldVaultV7ProxyFactory", rabbityieldVaultV7ProxyFactory.address);

  await hardhat.run("verify:verify", {
    address: rabbityieldVaultV7ProxyFactory.address,
    constructorArguments: [],
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });