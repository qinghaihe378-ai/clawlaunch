import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("💸 开始回收测试币...\n");

  const [owner] = await ethers.getSigners();
  
  // 创建测试钱包（使用相同的助记词）
  const hdNode = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase("test test test test test test test test test test test junk")
  );
  const wallet1 = new ethers.Wallet(hdNode.deriveChild(0).privateKey, ethers.provider);
  const wallet2 = new ethers.Wallet(hdNode.deriveChild(1).privateKey, ethers.provider);
  const wallet3 = new ethers.Wallet(hdNode.deriveChild(2).privateKey, ethers.provider);

  console.log("👥 测试钱包:");
  console.log("  Owner:  ", owner.address);
  console.log("  Wallet1:", wallet1.address);
  console.log("  Wallet2:", wallet2.address);
  console.log("  Wallet3:", wallet3.address);
  console.log("");

  // 检查余额
  console.log("💰 检查钱包余额...");
  const balance1 = await ethers.provider.getBalance(wallet1.address);
  const balance2 = await ethers.provider.getBalance(wallet2.address);
  const balance3 = await ethers.provider.getBalance(wallet3.address);

  console.log("  Wallet1:", ethers.formatEther(balance1), "BNB");
  console.log("  Wallet2:", ethers.formatEther(balance2), "BNB");
  console.log("  Wallet3:", ethers.formatEther(balance3), "BNB");
  console.log("");

  // 计算要转账的金额（扣除 gas 费用）
  const gasPrice = await ethers.provider.getFeeData();
  const estimatedGas = 21000n; // ETH 转账标准 gas
  const gasCost = estimatedGas * (gasPrice.gasPrice || 0n);
  const safetyBuffer = ethers.parseEther("0.001"); // 安全缓冲
  
  console.log("⚙️  Gas 配置:");
  console.log("  Gas Price:", ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei"), "gwei");
  console.log("  预估 Gas 成本:", ethers.formatEther(gasCost), "BNB");
  console.log("  安全缓冲:", ethers.formatEther(safetyBuffer), "BNB");
  console.log("");

  // Wallet1 转账
  if (balance1 > gasCost + safetyBuffer) {
    const transferAmount1 = balance1 - gasCost - safetyBuffer;
    console.log(`💸 Wallet1 转账 ${ethers.formatEther(transferAmount1)} BNB 到 Owner...`);
    const tx1 = await wallet1.sendTransaction({
      to: owner.address,
      value: transferAmount1
    });
    await tx1.wait();
    console.log("  ✅ 交易成功:", tx1.hash);
  } else {
    console.log("⚠️  Wallet1 余额不足，跳过");
  }

  // Wallet2 转账
  if (balance2 > gasCost + safetyBuffer) {
    const transferAmount2 = balance2 - gasCost - safetyBuffer;
    console.log(`💸 Wallet2 转账 ${ethers.formatEther(transferAmount2)} BNB 到 Owner...`);
    const tx2 = await wallet2.sendTransaction({
      to: owner.address,
      value: transferAmount2
    });
    await tx2.wait();
    console.log("  ✅ 交易成功:", tx2.hash);
  } else {
    console.log("⚠️  Wallet2 余额不足，跳过");
  }

  // Wallet3 转账
  if (balance3 > gasCost + safetyBuffer) {
    const transferAmount3 = balance3 - gasCost - safetyBuffer;
    console.log(`💸 Wallet3 转账 ${ethers.formatEther(transferAmount3)} BNB 到 Owner...`);
    const tx3 = await wallet3.sendTransaction({
      to: owner.address,
      value: transferAmount3
    });
    await tx3.wait();
    console.log("  ✅ 交易成功:", tx3.hash);
  } else {
    console.log("⚠️  Wallet3 余额不足，跳过");
  }

  console.log("");

  // 检查最终余额
  console.log("💰 最终余额:");
  const finalOwner = await ethers.provider.getBalance(owner.address);
  const final1 = await ethers.provider.getBalance(wallet1.address);
  const final2 = await ethers.provider.getBalance(wallet2.address);
  const final3 = await ethers.provider.getBalance(wallet3.address);

  console.log("  Owner:  ", ethers.formatEther(finalOwner), "BNB");
  console.log("  Wallet1:", ethers.formatEther(final1), "BNB");
  console.log("  Wallet2:", ethers.formatEther(final2), "BNB");
  console.log("  Wallet3:", ethers.formatEther(final3), "BNB");
  console.log("");
  console.log("✅ 回收完成！");
}

main().catch(console.error);
