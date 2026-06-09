import hre from "hardhat";

async function main() {
  console.log("🔧 更新 Factory 募资目标配置...\n");

  // 工厂合约地址
  const factoryAddress = "0xF51129367038D7505631C700fCb02ECE88877D0a";
  
  // 获取签名者
  const [signer] = await hre.ethers.getSigners();
  console.log("📍 操作地址:", signer.address);

  // 获取 Factory 合约
  const Factory = await hre.ethers.getContractFactory("MemeTokenFactory");
  const factory = await Factory.attach(factoryAddress);

  // 读取当前配置
  console.log("\n📊 当前配置：");
  const creationFee = await factory.creationFee();
  const targetRaise = await factory.targetRaise();
  const virtualBnbReserve = await factory.virtualBnbReserve();
  const buyFeeBps = await factory.buyFeeBps();
  const sellFeeBps = await factory.sellFeeBps();
  const antiSnipingDelay = await factory.antiSnipingDelaySeconds();

  console.log("  创建费:", hre.ethers.formatEther(creationFee), "BNB");
  console.log("  募资目标:", hre.ethers.formatEther(targetRaise), "BNB");
  console.log("  虚拟BNB储备:", hre.ethers.formatEther(virtualBnbReserve), "BNB");
  console.log("  买入手续费:", buyFeeBps.toString(), "BPS");
  console.log("  卖出手续费:", sellFeeBps.toString(), "BPS");
  console.log("  防狙击延迟:", antiSnipingDelay.toString(), "秒");

  // 新配置：修改募资目标
  // targetRaise: 16.5 BNB → 3 BNB
  const newTargetRaise = hre.ethers.parseEther("3");

  console.log("\n🎯 新配置：");
  console.log("  募资目标:", hre.ethers.formatEther(newTargetRaise), "BNB");
  console.log("  其他配置保持不变");

  console.log("\n⚠️  即将更新合约配置...");
  
  // 调用 setConfig 函数
  const tx = await factory.setConfig(
    creationFee,           // creationFee 不变
    newTargetRaise,        // targetRaise 改为 3 BNB
    virtualBnbReserve,     // virtualBnbReserve 不变
    buyFeeBps,             // buyFeeBps 不变
    sellFeeBps,            // sellFeeBps 不变
    antiSnipingDelay       // antiSnipingDelay 不变
  );

  console.log("\n📝 交易已发送:", tx.hash);
  console.log("⏳ 等待确认...");

  const receipt = await tx.wait();
  console.log("✅ 交易已确认！区块号:", receipt?.blockNumber);
  console.log("⛽ 消耗 Gas:", receipt?.gasUsed.toString());

  // 验证新配置
  console.log("\n✅ 验证新配置：");
  const newTargetRaiseValue = await factory.targetRaise();
  console.log("  募资目标:", hre.ethers.formatEther(newTargetRaiseValue), "BNB");

  console.log("\n🎉 配置更新完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
