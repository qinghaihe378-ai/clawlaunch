import { ethers } from "hardhat";

async function main() {
  // Factory 地址（当前部署的）
  const FACTORY_ADDRESS = "0xeEDAA1271dc3a5E9D38e76Aee68229ca6B39c3Cd";
  
  // 获取 signer（需要有 Owner 权限）
  const [owner] = await ethers.getSigners();
  console.log("Owner:", owner.address);

  // 连接 Factory 合约
  const factory = await ethers.getContractAt("MemeTokenFactory", FACTORY_ADDRESS);

  // 新的配置参数
  const newCreationFee = ethers.parseEther("0.005"); // 创建费：0.005 BNB
  const newTargetRaise = ethers.parseEther("16.5"); // 目标募资：16.5 BNB
  const newVirtualBnbReserve = ethers.parseEther("1"); // 虚拟储备：1 BNB
  const newBuyFeeBps = 100;   // 曲线买入手续费：1%
  const newSellFeeBps = 100;  // 曲线卖出手续费：1%
  const newAntiSnipingDelay = 120; // 防狙击延迟：120秒

  console.log("\n当前配置:");
  console.log("  创建费:", ethers.formatEther(await factory.creationFee()), "BNB");
  console.log("  买入手续费:", await factory.buyFeeBps(), "BPS");
  console.log("  卖出手续费:", await factory.sellFeeBps(), "BPS");

  console.log("\n准备更新配置...");
  const tx = await factory.setConfig(
    newCreationFee,
    newTargetRaise,
    newVirtualBnbReserve,
    newBuyFeeBps,
    newSellFeeBps,
    newAntiSnipingDelay
  );

  console.log("交易哈希:", tx.hash);
  console.log("等待确认...");
  await tx.wait();

  console.log("\n✅ 配置已更新!");
  console.log("新配置:");
  console.log("  创建费:", ethers.formatEther(await factory.creationFee()), "BNB");
  console.log("  买入手续费:", await factory.buyFeeBps(), "BPS");
  console.log("  卖出手续费:", await factory.sellFeeBps(), "BPS");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
