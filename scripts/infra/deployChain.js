const hardhat = require("hardhat");
const { upgrades } = require("hardhat");
const { addressBook } = require("blockchain-addressbook");

/**
 * Script used to deploy the basic infrastructure needed to run Rabbityield.
 */

const ethers = hardhat.ethers;

const {
  platforms: { 
    rabbityieldfinance: {
      keeper,
      voter, 
      rabbityieldFeeRecipient,
    } },
} = addressBook.arbitrum;

const TIMELOCK_ADMIN_ROLE = "0x5f58e3a2316349923ce3780f8d587db2d72378aed66a8261c916544fa6846ca5";
const STRAT_OWNER_DELAY = 21600;
const VAULT_OWNER_DELAY = 0;
const KEEPER = keeper;

const config = {
  devMultisig: "0xc2cCdd61187b81cC56EcA985bbaf9da418e3d87f",
  treasuryMultisig: "0x2E52C94502f728A634a7b8eFf5941FB066d3eE76",
  totalLimit: "95000000000000000",
  callFee: "500000000000000",
  strategist: "5000000000000000"
};

const proposer = config.devMultisig || TRUSTED_EOA;
const timelockProposers = [proposer];
const timelockExecutors = [proposer, KEEPER];

async function main() {
  await hardhat.run("compile");

  const deployer = await ethers.getSigner();

  const TimelockController = await ethers.getContractFactory("TimelockController");

  console.log("Deploying vault owner.");
  let deployParams = [VAULT_OWNER_DELAY, timelockProposers, timelockExecutors];
  const vaultOwner = await TimelockController.deploy(...deployParams);
  await vaultOwner.deployed();
  await vaultOwner.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address);
  console.log(`Vault owner deployed to ${vaultOwner.address}`);


  console.log("Deploying strategy owner.");
  const stratOwner = await TimelockController.deploy(STRAT_OWNER_DELAY, timelockProposers, timelockExecutors);
  await stratOwner.deployed();
  await stratOwner.renounceRole(TIMELOCK_ADMIN_ROLE, deployer.address);
  console.log(`Strategy owner deployed to ${stratOwner.address}`);

  console.log("Deploying multicall");
  const Multicall = await ethers.getContractFactory("Multicall");
  const multicall = await Multicall.deploy();
  await multicall.deployed();
  console.log(`Multicall deployed to ${multicall.address}`);

  const RabbityieldFeeConfiguratorFactory = await ethers.getContractFactory("RabbityieldFeeConfigurator");
  console.log("Deploying RabbityieldFeeConfigurator");

  const constructorArguments = [keeper, config.totalLimit];
  const transparentUpgradableProxy = await upgrades.deployProxy(RabbityieldFeeConfiguratorFactory, constructorArguments);
  await transparentUpgradableProxy.deployed();

  await transparentUpgradableProxy.setFeeCategory(0, BigInt(config.totalLimit), BigInt(config.callFee), BigInt(config.strategist), "default", true, true);
  await transparentUpgradableProxy.transferOwnership(config.devMultisig);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(transparentUpgradableProxy.address);

  console.log();
  console.log("RabbityieldFeeConfig:", transparentUpgradableProxy.address);
  console.log(`Implementation address:`, implementationAddress);

  console.log("Deploying Vault Factory");
  const VaultFactory = await ethers.getContractFactory("RabbityieldVaultV7Factory");
  const VaultV7 = await ethers.getContractFactory("RabbityieldVaultV7");
  const vault7 = await VaultV7.deploy();
  await vault7.deployed();
  console.log(`Vault V7 deployed to ${vault7.address}`);

  const vaultFactory = await VaultFactory.deploy(vault7.address);
  await vaultFactory.deployed();
  console.log(`Vault Factory deployed to ${vaultFactory.address}`);

  console.log("Deploying Rabbityield Swapper");
  const RabbityieldSwapper = await ethers.getContractFactory("RabbityieldSwapper");
  const rabbityieldSwapper = await RabbityieldSwapper.deploy();
  await rabbityieldSwapper.deployed();

  console.log(`Rabbityield Swapper deployed to ${rabbityieldSwapper.address}`);

  console.log('Deploying Rabbityield Oracle');
  const RabbityieldOracle = await ethers.getContractFactory("RabbityieldOracle");
  const rabbityieldOracle = await RabbityieldOracle.deploy();
  await rabbityieldOracle.deployed();

  rabbityieldSwapper.initialize(rabbityieldOracle.address, config.totalLimit);
  rabbityieldSwapper.transferOwnership(keeper);

  rabbityieldOracle.initialize();
  rabbityieldOracle.transferOwnership(keeper);
  console.log(`Rabbityield Oracle deployed to ${rabbityieldOracle.address}`);

  console.log(`
    const devMultisig = '${config.devMultisig}';
    const treasuryMultisig = '${config.treasuryMultisig}';
  
    export const rabbityieldfinance = {
      devMultisig,
      treasuryMultisig,
      strategyOwner: '${stratOwner.address}',
      vaultOwner: '${vaultOwner.address}',
      keeper: '0x4fED5491693007f0CD49f4614FFC38Ab6A04B619',
      treasurer: treasuryMultisig,
      launchpoolOwner: devMultisig,
      rewardPool: '${ethers.constants.AddressZero}',
      treasury: '${ethers.constants.AddressZero}',
      rabbityieldFeeRecipient: '0x02Ae4716B9D5d48Db1445814b0eDE39f5c28264B',
      multicall: '${multicall.address}',
      rabtMaxiStrategy: '${ethers.constants.AddressZero}',
      voter: '0x5e1caC103F943Cd84A1E92dAde4145664ebf692A',
      rabbityieldFeeConfig: '${transparentUpgradableProxy.address}',
      vaultFactory: '${vaultFactory.address}',
      wrapperFactory: '${ethers.constants.AddressZero}',
      zap: '${ethers.constants.AddressZero}',
      zapTokenManager: '${ethers.constants.AddressZero}',
      treasurySwapper: '${ethers.constants.AddressZero}',
    
      /// CLM Contracts
      clmFactory: '${ethers.constants.AddressZero}',
      clmStrategyFactory: '${ethers.constants.AddressZero}',
      clmRewardPoolFactory: '${ethers.constants.AddressZero}',
      positionMulticall: '${ethers.constants.AddressZero}',
    
      /// Rabbityield Swapper Contracts
      rabbityieldSwapper: '${rabbityieldSwapper.address}',
      rabbityieldOracle: '${rabbityieldOracle.address}',
      rabbityieldOracleChainlink: '${ethers.constants.AddressZero}',
      rabbityieldOracleUniswapV2: '${ethers.constants.AddressZero}',
      rabbityieldOracleUniswapV3: '${ethers.constants.AddressZero}',
    } as const;
  `)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
  