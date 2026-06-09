import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers } = hre;

async function main() {
  console.log(" 重新部署 MemeTokenFactory 合约...\n");

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log("📍 部署地址:", signer.address);
  console.log("⛽ BNB 余额:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "BNB\n");

  // 从现有配置读取地址
  const deploymentsPath = path.join(process.cwd(), "deployments", "bsc.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const treasury = deployments.treasury;
  const wbnb = deployments.wbnb;
  const router = deployments.router;
  const taxDeployer = deployments.taxDeployer;

  console.log(" 现有配置:");
  console.log("  Treasury:", treasury);
  console.log("  WBNB:", wbnb);
  console.log("  Router:", router);
  console.log("  TaxDeployer:", taxDeployer);
  console.log("");

  // 部署新的 Factory
  console.log(" 开始部署新 Factory 合约...");
  const Factory = await ethers.getContractFactory("MemeTokenFactory");
  const factory = await Factory.deploy(
    signer.address,  // owner
    treasury,
    wbnb,
    router,
    taxDeployer
  );

  console.log("📝 交易已发送:", factory.deploymentTransaction()?.hash);
  console.log(" 等待确认...");

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("\n✅ 部署成功！");
  console.log("📍 新 Factory 地址:", factoryAddress);

  // 验证配置
  console.log("\n📊 验证新合约配置:");
  const creationFee = await factory.creationFee();
  const targetRaise = await factory.targetRaise();
  console.log("  创建费:", ethers.formatEther(creationFee), "BNB");
  console.log("  募资目标:", ethers.formatEther(targetRaise), "BNB");

  // 更新部署文件
  console.log("\n 更新部署配置...");
  deployments.factory = factoryAddress;
  deployments.deployedAt = new Date().toISOString();
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ 部署配置已更新");

  console.log("\n⚠️  注意:");
  console.log("  1. 新 Factory 合约已部署");
  console.log("  2. Locker 合约地址不变（旧合约继续有效）");
  console.log("  3. 需要更新前端和后端配置中的 Factory 地址");
  console.log("  4. 建议验证合约: npx hardhat verify", factoryAddress, signer.address, treasury, wbnb, router, taxDeployer);

  console.log("\n🎉 Factory 合约重新部署完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
