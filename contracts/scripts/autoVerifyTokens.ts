import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const { ethers } = hre;

// ES Module 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 开始监听 TokenCreated 事件并自动验证...\n");

  // 从 deployments 文件读取 Factory 地址（自动更新）
  const deploymentPath = path.resolve(__dirname, "../deployments/bsc.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const factoryAddress = deployment.factory;
  
  console.log(`📍 Factory 地址: ${factoryAddress}`);
  console.log(`📄 配置文件: ${deploymentPath}\n`);
  
  const factory = await ethers.getContractAt("MemeTokenFactory", factoryAddress);

  // 获取当前区块号作为起始点
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log(`📍 从区块 ${currentBlock} 开始监听\n`);

  // 监听 TokenCreated 事件
  factory.on("TokenCreated", async (token, market, creator, event) => {
    console.log(`\n✅ 检测到新代币创建!`);
    console.log(`   代币地址: ${token}`);
    console.log(`   Market地址: ${market}`);
    console.log(`   创建者: ${creator}`);
    console.log(`   交易哈希: ${event.transactionHash}`);

    try {
      // 等待 10 秒确保合约已完全部署
      console.log("\n⏳ 等待 10 秒后开始验证...");
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 获取代币信息
      const tokenInfo = await factory.tokenInfo(token);
      const templateId = tokenInfo.templateId;
      const taxBps = tokenInfo.taxBps;
      const burnShareBps = tokenInfo.burnShareBps;
      const holderShareBps = tokenInfo.holderShareBps;
      const liquidityShareBps = tokenInfo.liquidityShareBps;
      const buybackShareBps = tokenInfo.buybackShareBps;

      // 验证 MemeToken 或 MemeTokenTax 合约
      if (templateId === 0n) {
        console.log("\n🔧 验证 MemeToken 合约...");
        const name = await ethers.getContractAt("MemeToken", token).then(t => t.name());
        const symbol = await ethers.getContractAt("MemeToken", token).then(t => t.symbol());
        
        await verifyWithRetry(
          {
            address: token,
            constructorArguments: [name, symbol, 1000000000000000000000000n, factoryAddress, factoryAddress]
          },
          "MemeToken"
        );
      } else if (templateId === 1n) {
        console.log("\n 这是带税代币，验证 MemeTokenTax 合约...");
        const name = await ethers.getContractAt("MemeTokenTax", token).then(t => t.name());
        const symbol = await ethers.getContractAt("MemeTokenTax", token).then(t => t.symbol());
        const treasury = await factory.treasury();
        const wbnb = await factory.wbnb();
        const router = await factory.router();
        
        await verifyWithRetry(
          {
            address: token,
            constructorArguments: [
              name,
              symbol,
              1000000000000000000000000n,
              factoryAddress,
              factoryAddress,
              treasury,
              wbnb,
              router,
              taxBps,
              burnShareBps,
              holderShareBps,
              liquidityShareBps,
              buybackShareBps
            ]
          },
          "MemeTokenTax"
        );
      }

      // 验证 BondingCurveMarket 合约
      console.log("\n🔧 验证 BondingCurveMarket 合约...");
      const marketContract = await ethers.getContractAt("BondingCurveMarket", market);
      const targetRaise = await marketContract.targetRaise();
      
      await verifyWithRetry(
        {
          address: market,
          constructorArguments: [
            token,
            creator,
            await factory.treasury(),
            targetRaise,
            await factory.buyFeeBps(),
            await factory.sellFeeBps(),
            await marketContract.curveR(),
            await marketContract.liquidityTokenReserve(),
            await marketContract.antiSnipingDelaySeconds(),
            await factory.wbnb(),
            await factory.router(),
            await factory.locker()
          ]
        },
        "BondingCurveMarket"
      );

      console.log("\n✅ 所有合约验证完成!\n");
    } catch (error: any) {
      console.error("\n❌ 验证失败:", error.message);
    }
  });

  console.log("🎯 监听器已启动，按 Ctrl+C 停止\n");

  // 保持进程运行
  process.on("SIGINT", () => {
    console.log("\n 停止监听");
    process.exit(0);
  });
}

async function verifyWithRetry(args: { address: string; constructorArguments: unknown[] }, label: string, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await hre.run("verify:verify", args);
      console.log(`✅ ${label} 验证成功!`);
      return;
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`️  ${label} 已经验证过`);
        return;
      }
      if (i < maxRetries - 1) {
        console.log(`⚠️  ${label} 验证失败，重试 ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
