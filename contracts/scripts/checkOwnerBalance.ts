import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [owner] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(owner.address);
  console.log("Owner地址:", owner.address);
  console.log("当前余额:", ethers.formatEther(balance), "BNB");
}

main().catch(console.error);
