#!/bin/bash

rm tmp/*.sol

echo "// SPDX-License-Identifier: MIT" > tmp/TimelockController.sol
truffle-flattener node_modules/@openzeppelin-4/contracts/governance/TimelockController.sol | sed '/SPDX-License-Identifier/d' >> tmp/TimelockController.sol

echo "// SPDX-License-Identifier: MIT" > tmp/RabbityieldTreasury.sol
hardhat flatten contracts/RABT/infra/RabbityieldTreasury.sol | sed '/SPDX-License-Identifier/d' >> tmp/RabbityieldTreasury.sol

echo "// SPDX-License-Identifier: MIT" > tmp/Multicall.sol
hardhat flatten contracts/RABT/utils/Multicall.sol | sed '/SPDX-License-Identifier/d' >> tmp/Multicall.sol

echo "// SPDX-License-Identifier: MIT" > tmp/RabbityieldRewardPool.sol
hardhat flatten contracts/RABT/infra/RabbityieldRewardPool.sol | sed '/SPDX-License-Identifier/d' >> tmp/RabbityieldRewardPool.sol

echo "// SPDX-License-Identifier: MIT" > tmp/RabbityieldFeeBatchV2.sol
hardhat flatten contracts/RABT/infra/RabbityieldFeeBatchV2.sol | sed '/SPDX-License-Identifier/d' >> tmp/RabbityieldFeeBatchV2.sol


