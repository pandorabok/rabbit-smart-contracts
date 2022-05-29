import hardhat, { ethers, upgrades } from "hardhat";
import { verifyContract } from "../../utils/verifyContract";

const shouldVerifyOnEtherscan = true;

const contractNames = {
  RabbityieldFeeConfigurator: "RabbityieldFeeConfigurator",
};

const config = {
  keeper: "0x4fED5491693007f0CD49f4614FFC38Ab6A04B619",
  totalLimit: "95000000000000000",
}

const implementationConstructorArguments: any[] = []; // proxy implementations cannot have constructors

const deploy = async () => {
  const RabbityieldFeeConfiguratorFactory = await ethers.getContractFactory(contractNames.RabbityieldFeeConfigurator)

  console.log("Deploying:", contractNames.RabbityieldFeeConfigurator);

  const constructorArguments: any[] = [config.keeper, config.totalLimit];
  const transparentUpgradableProxy = await upgrades.deployProxy(RabbityieldFeeConfiguratorFactory, constructorArguments);
  await transparentUpgradableProxy.deployed();

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(transparentUpgradableProxy.address);

  console.log();
  console.log("TransparentUpgradableProxy:", transparentUpgradableProxy.address);
  console.log(`Implementation address (${contractNames.RabbityieldFeeConfigurator}):`, implementationAddress);

  console.log();
  console.log("Running post deployment");

  const verifyContractsPromises: Promise<any>[] = [];
  if (shouldVerifyOnEtherscan) {
    console.log(`Verifying ${contractNames.RabbityieldFeeConfigurator}`);
    verifyContractsPromises.push(verifyContract(implementationAddress, implementationConstructorArguments));
  }
  console.log();

  await Promise.all(verifyContractsPromises);
};

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
