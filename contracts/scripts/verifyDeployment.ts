import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers } = hre;

async function main() {
  // 从部署文件读取地址
  const deploymentsPath = path.join(process.cwd(), "deployments", "bscTestnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  
  console.log("📋 测试网合约地址:");
  console.log("  Factory:", deployments.factory);
  console.log("  Locker:", deployments.locker);
  console.log("  TaxDeployer:", deployments.taxDeployer);
  console.log("  Treasury:", deployments.treasury);
  console.log("");

  // 连接 Factory
  const factory = await ethers.getContractAt("MemeTokenFactory", deployments.factory);

  // 读取配置
  const creationFee = await factory.creationFee();
  const buyFeeBps = await factory.buyFeeBps();
  const sellFeeBps = await factory.sellFeeBps();
  const targetRaise = await factory.targetRaise();
  const antiSnipingDelay = await factory.antiSnipingDelaySeconds();

  console.log("⚙️  Factory 配置:");
  console.log("  创建费:", ethers.formatEther(creationFee), "BNB");
  console.log("  买入手续费:", buyFeeBps.toString(), "BPS", `(${Number(buyFeeBps) / 100}%)`);
  console.log("  卖出手续费:", sellFeeBps.toString(), "BPS", `(${Number(sellFeeBps) / 100}%)`);
  console.log("  目标募资:", ethers.formatEther(targetRaise), "BNB");
  console.log("  防狙击延迟:", antiSnipingDelay.toString(), "秒");
  console.log("");

  // 验证配置是否符合预期
  const expectedCreationFee = ethers.parseEther("0.005");
  const expectedBuyFeeBps = 100;
  const expectedSellFeeBps = 100;

  console.log("✅ 配置验证:");
  console.log("  创建费:", creationFee.toString() === expectedCreationFee.toString() ? "✅ 正确 (0.005 BNB)" : `❌ 错误 (实际: ${creationFee.toString()})`);
  console.log("  买入手续费:", buyFeeBps.toString() === expectedBuyFeeBps.toString() ? "✅ 正确 (1%)" : `❌ 错误 (实际: ${buyFeeBps.toString()} BPS)`);
  console.log("  卖出手续费:", sellFeeBps.toString() === expectedSellFeeBps.toString() ? "✅ 正确 (1%)" : `❌ 错误 (实际: ${sellFeeBps.toString()} BPS)`);
  console.log("");

  // 检查 BondingCurveMarket 的锁仓时间（需要部署一个代币来验证）
  console.log("💡 提示:");
  console.log("  - 锁仓时间在 BondingCurveMarket 合约中固定为 365 天");
  console.log("  - 需要创建代币后才能验证");
  console.log("");

  console.log("🎉 测试网部署验证完成!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
