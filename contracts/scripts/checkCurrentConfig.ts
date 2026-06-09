import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log(" 检查主网 Factory 合约当前配置...\n");

  // 主网 Factory 地址
  const factoryAddress = "0xF51129367038D7505631C700fCb02ECE88877D0a";
  
  // 连接 Factory 合约
  const factory = await ethers.getContractAt("MemeTokenFactory", factoryAddress);

  // 读取当前配置
  const creationFee = await factory.creationFee();
  const targetRaise = await factory.targetRaise();
  const virtualBnbReserve = await factory.virtualBnbReserve();
  const buyFeeBps = await factory.buyFeeBps();
  const sellFeeBps = await factory.sellFeeBps();
  const antiSnipingDelay = await factory.antiSnipingDelaySeconds();

  console.log("⚙️  当前 Factory 配置:");
  console.log("  创建费:", ethers.formatEther(creationFee), "BNB");
  console.log("   目标募资:", ethers.formatEther(targetRaise), "BNB");
  console.log("  虚拟BNB储备:", ethers.formatEther(virtualBnbReserve), "BNB");
  console.log("  买入手续费:", buyFeeBps.toString(), "BPS", `(${Number(buyFeeBps) / 100}%)`);
  console.log("  卖出手续费:", sellFeeBps.toString(), "BPS", `(${Number(sellFeeBps) / 100}%)`);
  console.log("  防狙击延迟:", antiSnipingDelay.toString(), "秒");
  console.log("");

  if (targetRaise === ethers.parseEther("3")) {
    console.log("✅ 配置正确！目标募资已更新为 3 BNB");
  } else {
    console.log("❌ 配置还是旧值:", ethers.formatEther(targetRaise), "BNB");
    console.log("  需要执行 setConfig 交易");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
