import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [owner] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(owner.address);
  console.log("地址:", owner.address);
  console.log("余额:", ethers.formatEther(balance), "BNB");
  console.log("");
  console.log("需要至少 0.02 BNB 才能完成测试");
  console.log("如果余额不足，请从水龙头获取:");
  console.log("https://testnet.bnbchain.org/faucet-smart");
}

main().catch(console.error);
