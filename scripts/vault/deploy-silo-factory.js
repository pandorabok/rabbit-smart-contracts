import hardhat, { ethers, web3 } from "hardhat";
import { addressBook } from "blockchain-addressbook";
import vaultV7 from "../../artifacts/contracts/RABT/vaults/RabbityieldVaultV7.sol/RabbityieldVaultV7.json";
import vaultV7Factory from "../../artifacts/contracts/RABT/vaults/RabbityieldVaultV7Factory.sol/RabbityieldVaultV7Factory.json";
import strategyFactory from "../../artifacts/contracts/RABT/infra/StrategyFactory.sol/StrategyFactory.json"
import stratAbi from "../../artifacts/contracts/RABT/strategies/Silo/StrategySiloV2.sol/StrategySiloV2.json";

const {
  platforms: { rabbityieldfinance, balancer },
  tokens: {
   /* USDC: { address: USDC },
    BAL: { address: BAL },
    AURA: { address: AURA }*/
    S: { address: S },
    USDCe: { address: USDCe }
  },
} = addressBook.sonic;


const want = USDCe;
const gauge = web3.utils.toChecksumAddress(ethers.constants.AddressZero);
const silo = web3.utils.toChecksumAddress("0x4E216C15697C1392fE59e1014B009505E05810Df");

const platform = "SiloV2";
const tokens = ["USDC.e"]
const tokensCombined = "USDC.e (wS Market)";
const chain = "Sonic";
const id = "silov2-sonic-usdce-ws";

const vaultParams = {
  mooName: "Moo " + platform + " " + chain + " " + tokensCombined,
  mooSymbol: "moo" + platform + chain + tokensCombined,
  delay: 21600,
};

const strategyParams = {
  want: want,
  gauge: gauge,
  silo: silo,
  swapper: rabbityieldfinance.rabbityieldSwapper,
  depositToken: want,
  strategist: "0xdad00eCa971D7B22e0dE1B874fbae30471B75354", // some address
  keeper: rabbityieldfinance.keeper,
  rabbityieldFeeRecipient: rabbityieldfinance.rabbityieldFeeRecipient,
  feeConfig: rabbityieldfinance.rabbityieldFeeConfig,
  verifyStrat: false,
  rewards: [],
  rabbityieldVaultProxy: rabbityieldfinance.vaultFactory,
  stratFactory: rabbityieldfinance.strategyFactory,
  strategyImplementationName: "StrategySiloV2",
  useVaultProxy: true,
 // ensId
};

async function main() {
 if (
    Object.values(vaultParams).some(v => v === undefined) ||
    Object.values(strategyParams).some(v => v === undefined)
  ) {
    console.error("one of config values undefined");
    return;
  }

  await hardhat.run("compile");

  console.log("Deploying:", vaultParams.mooName);

  console.log(vaultParams, strategyParams)

  const factory = await ethers.getContractAt(vaultV7Factory.abi, strategyParams.rabbityieldVaultProxy);
  const stratFactory = await ethers.getContractAt(strategyFactory.abi, strategyParams.stratFactory);
  let vault = await factory.callStatic.cloneVault();
  let tx = await factory.cloneVault();
  tx = await tx.wait();
  tx.status === 1
  ? console.log(`Vault ${vault} is deployed with tx: ${tx.transactionHash}`)
  : console.log(`Vault ${vault} deploy failed with tx: ${tx.transactionHash}`);

  let strat = await stratFactory.callStatic.createStrategy(strategyParams.strategyImplementationName);
  let stratTx = await stratFactory.createStrategy(strategyParams.strategyImplementationName);;
  stratTx = await stratTx.wait();
  stratTx.status === 1
  ? console.log(`Strat ${strat} is deployed with tx: ${stratTx.transactionHash}`)
  : console.log(`Strat ${strat} deploy failed with tx: ${stratTx.transactionHash}`);

  const vaultConstructorArguments = [
    strat,
    vaultParams.mooName,
    vaultParams.mooSymbol,
    vaultParams.delay,
  ];

  const vaultContract = await ethers.getContractAt(vaultV7.abi, vault);
  let vaultInitTx = await vaultContract.initialize(...vaultConstructorArguments);
  vaultInitTx = await vaultInitTx.wait()
  vaultInitTx.status === 1
  ? console.log(`Vault Intilization done with tx: ${vaultInitTx.transactionHash}`)
  : console.log(`Vault Intilization failed with tx: ${vaultInitTx.transactionHash}`);

  vaultInitTx = await vaultContract.transferOwnership(rabbityieldfinance.vaultOwner);
  vaultInitTx = await vaultInitTx.wait()
  vaultInitTx.status === 1
  ? console.log(`Vault OwnershipTransfered done with tx: ${vaultInitTx.transactionHash}`)
  : console.log(`Vault Intilization failed with tx: ${vaultInitTx.transactionHash}`);

  const strategyConstructorArguments = [
    strategyParams.silo,
    strategyParams.gauge,
    strategyParams.rewards,
    [
      strategyParams.want,
      strategyParams.depositToken,
      strategyParams.stratFactory,
      vault,
      strategyParams.swapper,
      strategyParams.strategist,
    ]
  ];
  console.log(strategyConstructorArguments)

  let abi = stratAbi.abi;
  const stratContract = await ethers.getContractAt(abi, strat);
  let args =  strategyConstructorArguments
  let stratInitTx = await stratContract.initialize(...args);
  stratInitTx = await stratInitTx.wait()
  stratInitTx.status === 1
  ? console.log(`Strat Intilization done with tx: ${stratInitTx.transactionHash}`)
  : console.log(`Strat Intilization failed with tx: ${stratInitTx.transactionHash}`);

  console.log(` ---- V2 Blob -------`);
  console.log(`
{
    "id": "${id}",
    "name": "${tokensCombined}",
    "type": "standard",
    "token": "${tokensCombined}",
    "tokenAddress": "${want}",
    "tokenDecimals": 18,
    "tokenProviderId": "${platform.toLowerCase()}",
    "earnedToken": "${vaultParams.mooSymbol}",
    "earnedTokenAddress": "${vault}",
    "earnContractAddress": "${vault}",
    "oracle": "lps",
    "oracleId": "${id}",
    "createdAt": ${(Date.now() / 1000).toFixed(0)},
    "status": "active",
    "platformId": "${platform.toLowerCase()}",
    "assets": ["${tokens[0]}"],
    "risks": ["COMPLEXITY_LOW", "BATTLE_TESTED", "MCAP_LARGE", "CONTRACTS_VERIFIED"],
    "strategyTypeId": "lendingNoBorrow",
    "network": "${chain.toLowerCase()}",
     "zaps": [
      {
        "strategyId": "single"
      }
    ],
    "lendingOracle": {
      "provider": "chainlink",
      "address": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"
    }
  },
    `)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });