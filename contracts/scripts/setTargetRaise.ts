import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log(" 设置新 Factory 的募资目标为 3 BNB...\n");

  const factoryAddress = "0x6066e43888D8779322e9ab5dF151b26402807711";
  const [signer] = await ethers.getSigners();
  console.log(" 操作地址:", signer.address);

  const Factory = await ethers.getContractFactory("MemeTokenFactory");
  const factory = Factory.attach(factoryAddress);

  // 读取当前配置
  const creationFee = await factory.creationFee();
  const virtualBnbReserve = await factory.virtualBnbReserve();
  const buyFeeBps = await factory.buyFeeBps();
  const sellFeeBps = await factory.sellFeeBps();
  const antiSnipingDelay = await factory.antiSnipingDelaySeconds();

  console.log("\n📊 当前配置:");
  console.log("  募资目标:", ethers.formatEther(await factory.targetRaise()), "BNB");

  // 调用 setConfig
  const newTargetRaise = ethers.parseEther("3");
  console.log("\n 设置募资目标为:", ethers.formatEther(newTargetRaise), "BNB");

  const tx = await factory.setConfig(
    creationFee,
    newTargetRaise,
    virtualBnbReserve,
    buyFeeBps,
    sellFeeBps,
    antiSnipingDelay
  );

  console.log("\n📝 交易已发送:", tx.hash);
  console.log(" 等待确认...");

  await tx.wait();
  console.log("✅ 配置更新成功！");

  // 验证
  const newTargetRaiseValue = await factory.targetRaise();
  console.log(" 新募资目标:", ethers.formatEther(newTargetRaiseValue), "BNB");

  console.log("\n🎉 完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
