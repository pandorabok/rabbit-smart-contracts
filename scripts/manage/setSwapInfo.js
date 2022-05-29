import hardhat, { ethers, web3 } from "hardhat";
import swapperAbi from "../../artifacts/contracts/RABT/infra/RabbityieldSwapper.sol/RabbityieldSwapper.json";
import UniswapV2RouterAbi from "../../data/abi/UniswapV2Router.json";
import UniswapV3RouterAbi from "../../data/abi/UniswapV3Router.json";
import UniswapV3Router2Abi from "../../data/abi/UniswapV3Router2.json";
import BalancerVaultAbi from "../../data/abi/BalancerVault.json";
import VelodromeRouterAbi from "../../data/abi/VelodromeRouter.json";
import TraderJoeRouterAbi from "../../data/abi/TraderJoeRouter.json";
import AlgebraRouterAbi from "../../data/abi/AlgebraRouterAbi.json";
import StableRouterAbi from "../../data/abi/StableRouter.json";
import CurveRouterAbi from "../../data/abi/CurveRouter.json";
import SyncRouterAbi from "../../data/abi/SyncRouter.json";
import MultihopRouterAbi from "../../data/abi/MultihopRouter.json";
import { addressBook } from "blockchain-addressbook";

const {
  platforms: { rabbityieldfinance },
  tokens: {
    USDT: { address: USDT},
    USDC: {address: USDC},
    WETH: {address: WETH},
  },
} = addressBook.scroll;
const token = "0x77fbf86399ed764A084F77B9acCb049F3DbC32d2";

const ethers = hardhat.ethers;

const nullAddress = "0x0000000000000000000000000000000000000000";
const uint256Max = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
const int256Max = "57896044618658097711785492504343953926634992332820282019728792003956564819967";
const rabbityieldfinanceSwapper = rabbityieldfinance.rabbityieldSwapper;

const uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const uniswapV2Router = "0x8c1A3cF8f83074169FE5D7aD50B978e1cD6b37c7";
const velodromeRouter = "0xAAA45c8F5ef92a000a121d102F4e89278a711Faa";
const balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
const traderJoeRouter = "0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30";
const algebraRouter = "0xAc48FcF1049668B285f3dC72483DF5Ae2162f7e8";
const curveRouter = "0xF0d4c12A5768D806021F80a262B4d39d26C58b8D";
const syncRouter = "0xC2a1947d2336b2AF74d5813dC9cA6E0c3b3E8a1E";
const multihopRouter = "0x1DEF2c354bcFa4d1A8F40c4c33Ef7d27DB4109cA";


const config = {
  type: "uniswapV3",
  uniswapV3: {
    path: [[WETH, USDC, 3000]],
    router: uniswapV3Router,
    router2: false
  },
  uniswapV2: {
    path: [WETH, token],
    router: uniswapV2Router,
  },
  balancer: {
    path: [
      [USDT, USDC, "0x3ff3a210e57cfe679d9ad1e9ba6453a716c56a2e0002000000000000000005d5"],
      [USDC, WETH, "0x96646936b91d6b9d7d0c47c496afbf3d6ec7b6f8000200000000000000000019"]
    ],
    router: balancerVault,
  },
  solidly: {
    path: [[USDC, token, true]],
    router: velodromeRouter,
  },
  traderJoe: {
    path: [[20], [2], [WETH, USDC]],
    router: traderJoeRouter,
  },
  algebra: {
    path: [token, WETH],
    router: algebraRouter,
  },
  stable: {
    router: "0x18f7402B673Ba6Fb5EA4B95768aABb8aaD7ef18a"
  },
  curve: {
    route: [nullAddress, nullAddress, nullAddress, nullAddress, nullAddress, nullAddress, nullAddress, nullAddress, nullAddress, nullAddress, nullAddress],
    params: [[1,0,1,3,3],[0,1,1,1,2],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]]
  },
  syncswap: {
    router: "0xC2a1947d2336b2AF74d5813dC9cA6E0c3b3E8a1E",
    route: [WETH, token],
    steps: [["0x63EF8Ab47507f771C799Ab8ee3210857AE0bD1dA",,nullAddress,"0x",true]]
  },
  multihop: {
    path: [WETH, USDC, token],
    router: multihopRouter,
  }
};

async function main() {
  switch(config.type) {
    case 'uniswapV3':
      await uniswapV3();
      break;
    case 'uniswapV2':
      await uniswapV2();
      break;
    case 'balancer':
      await balancer();
      break;
    case 'solidly':
      await solidly();
      break;
    case 'traderJoe':
      await traderJoe();
      break;
    case 'algebra':
      await algebra();
      break;
    case 'stable':
      await stable();
      break;
    case 'curve':
      await curve();
      break;
    case 'syncswap':
      await syncswap();
      break;
    case 'multihop':
      await multihop();
      break;
  }
};

async function uniswapV3() {
  const router = await ethers.getContractAt(UniswapV3RouterAbi, config.uniswapV3.router);

  let path = ethers.utils.solidityPack(
    ["address"],
    [config.uniswapV3.path[0][0]]
  );

  for (let i = 0; i < config.uniswapV3.path.length; i++) {
      path = ethers.utils.solidityPack(
        ["bytes", "uint24", "address"],
        [path, config.uniswapV3.path[i][2], config.uniswapV3.path[i][1]]
      );
  }

  const exactInputParams = [
    path,
    rabbityieldfinanceSwapper,
    uint256Max,
    0,
    0
  ];

  let txData;
  let amountIndex;
  let minIndex;

  if (config.uniswapV3.router2) {
    const router = await ethers.getContractAt(UniswapV3Router2Abi, config.uniswapV3.router);
    txData = await router.populateTransaction.exactInput(exactInputParams);
    amountIndex = 100;
    minIndex = 132;
  } else {
    const router = await ethers.getContractAt(UniswapV3RouterAbi, config.uniswapV3.router);
    txData = await router.populateTransaction.exactInput(exactInputParams);
    amountIndex = 132;
    minIndex = 164;
  }

  const minAmountSign = 0;

  const swapInfo = [
    config.uniswapV3.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(config.uniswapV3.path[0][0],
    config.uniswapV3.path[config.uniswapV3.path.length - 1][1],
    swapInfo);

  /*await setSwapInfo(
    config.uniswapV3.path[0][0],
    config.uniswapV3.path[config.uniswapV3.path.length - 1][1],
    swapInfo
  );*/
};

async function uniswapV2() {
  const router = await ethers.getContractAt(UniswapV2RouterAbi, config.uniswapV2.router);
  const txData = await router.populateTransaction.swapExactTokensForTokens(
    0,
    0,
    config.uniswapV2.path,
    rabbityieldfinanceSwapper,
    uint256Max
  );
  const amountIndex = 4;
  const minIndex = 36;
  const minAmountSign = 0;

  const swapInfo = [
    config.uniswapV2.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(config.uniswapV2.path[0], config.uniswapV2.path[config.uniswapV2.path.length - 1], swapInfo);

  /*await setSwapInfo(
    config.uniswapV2.path[0],
    config.uniswapV2.path[config.uniswapV2.path.length - 1],
    swapInfo
  );*/
};

async function balancer() {
  const router = await ethers.getContractAt(BalancerVaultAbi, config.balancer.router);
  const swapKind = 0;
  const swapSteps = [];
  const assets = [];
  const funds = [rabbityieldfinanceSwapper, false, rabbityieldfinanceSwapper, false];
  const limits = [int256Max];
  const deadline = uint256Max;

  for (let i = 0; i < config.balancer.path.length; ++i) {
    swapSteps.push([config.balancer.path[i][2], i, i + 1, 0, []])
    assets.push(config.balancer.path[i][0]);
    limits.push(0);
  }
  assets.push(config.balancer.path[config.balancer.path.length - 1][1]);

  const txData = await router.populateTransaction.batchSwap(
    swapKind,
    swapSteps,
    assets,
    funds,
    limits,
    deadline
  );
  const amountIndex = 420 + (32 * config.balancer.path.length);
  const minIndex = (txData.data.length - 66) / 2;
  const minAmountSign = -1;

  const swapInfo = [
    config.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  /*await setSwapInfo(
    config.uniswapV2.path[0],
    config.uniswapV2.path[config.uniswapV2.path.length - 1],
    swapInfo
  );*/
};

async function solidly() {
  const router = await ethers.getContractAt(VelodromeRouterAbi, config.solidly.router);
  const txData = await router.populateTransaction.swapExactTokensForTokens(0, 0, config.solidly.path, rabbityieldfinanceSwapper, uint256Max);
  const amountIndex = 4;
  const minIndex = 36;
  const minAmountSign = 0;

  const swapInfo = [
    config.solidly.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(config.solidly.path[0][0], config.solidly.path[config.solidly.path.length - 1][1], swapInfo);

  await setSwapInfo(
    config.solidly.path[0][0],
    config.solidly.path[config.solidly.path.length - 1][1],
    swapInfo
  );
};

async function traderJoe() {
  const router = await ethers.getContractAt(TraderJoeRouterAbi, config.traderJoe.router);

  const path = config.traderJoe.path;
  const txData = await router.populateTransaction.swapExactTokensForTokens(0, 0, path, rabbityieldfinanceSwapper, uint256Max);
  const amountIndex = 4;
  const minIndex = 36;

  const minAmountSign = 0;

  const swapInfo = [
    config.traderJoe.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(swapInfo);

  /*await setSwapInfo(
    config.uniswapV3.path[0][0],
    config.uniswapV3.path[config.uniswapV3.path.length - 1][1],
    swapInfo
  );*/
};

async function algebra() {
  const router = await ethers.getContractAt(AlgebraRouterAbi, config.algebra.router);

  let path = ethers.utils.solidityPack(
    ["address"],
    [config.algebra.path[0]]
  );
  for (let i = 1; i < config.algebra.path.length; i++) {
      path = ethers.utils.solidityPack(
        ["bytes","address"],
        [path, config.algebra.path[i]]
      );
  }
  const exactInputParams = [
    path,
    rabbityieldfinanceSwapper,
    uint256Max,
    0,
    0
  ];
  const txData = await router.populateTransaction.exactInput(exactInputParams);
  const amountIndex = 132;
  const minIndex = 164;

  const minAmountSign = 0;

  const swapInfo = [
    config.algebra.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(config.algebra.path[0],
    config.algebra.path[config.algebra.path.length - 1],
    swapInfo);
};

async function stable() {
  const router = await ethers.getContractAt(StableRouterAbi, config.stable.router);
  const txData = await router.populateTransaction.addLiquidity([0,0], 0, uint256Max);
  const amountIndex = 132;
  const minIndex = 36;
  const minAmountSign = 0;

  const swapInfo = [
    config.stable.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(swapInfo);
};

async function curve() {
  const router = await ethers.getContractAt(CurveRouterAbi, curveRouter);
  const txData = await router.populateTransaction["exchange(address[11],uint256[5][5],uint256,uint256)"](config.curve.route, config.curve.params, uint256Max, 0);
  const amountIndex = 1156;
  const minIndex = 1188;
  const minAmountSign = 0;

  const swapInfo = [
    curveRouter,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(swapInfo);
};

async function syncswap() {

  const router = await ethers.getContractAt(SyncRouterAbi, config.syncswap.router);

  let data = ethers.utils.defaultAbiCoder.encode(
    ["address","address","uint8"],
    [config.syncswap.route[0], rabbityieldfinanceSwapper, 2]
  );

  config.syncswap.steps[0][1] = data;

  const paths = [[config.syncswap.steps, config.syncswap.route[0], 0]];
  const txData = await router.populateTransaction.swap(paths, 0, uint256Max);
  const amountIndex = 228;
  const minIndex = 36;

  const minAmountSign = 0;

  const swapInfo = [
    config.syncswap.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];
  console.log(config.syncswap.router)

  console.log(config.syncswap.route[0],
    config.syncswap.route[config.syncswap.route.length - 1],
    swapInfo);

  console.log(txData.data.indexOf('03'));

  /*await setSwapInfo(
    config.uniswapV3.path[0][0],
    config.uniswapV3.path[config.uniswapV3.path.length - 1][1],
    swapInfo
  );*/
};

async function multihop() {

  const router = await ethers.getContractAt(MultihopRouterAbi, config.multihop.router);

  const txData = await router.populateTransaction.swap(config.multihop.path, 0, 0);
  const amountIndex = 36;
  const minIndex = 68;

  const minAmountSign = 0;

  const swapInfo = [
    config.multihop.router,
    txData.data,
    amountIndex,
    minIndex,
    minAmountSign
  ];

  console.log(config.multihop.path[0],
    config.multihop.path[config.multihop.path.length - 1],
    swapInfo);

  /*await setSwapInfo(
    config.uniswapV3.path[0][0],
    config.uniswapV3.path[config.uniswapV3.path.length - 1][1],
    swapInfo
  );*/
};

async function setSwapInfo(fromToken, toToken, swapInfo) {
  const [_, keeper, rewarder] = await ethers.getSigners();
  const swapper = await ethers.getContractAt(swapperAbi.abi, rabbityieldfinanceSwapper, keeper);

  let tx = await swapper.setSwapInfo(fromToken, toToken, swapInfo);
  tx = await tx.wait();
    tx.status === 1
      ? console.log(`Info set for ${toToken} with tx: ${tx.transactionHash}`)
      : console.log(`Could not set info for ${toToken}} with tx: ${tx.transactionHash}`)
};

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
