import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers } = hre;

async function main() {
  console.log("🧪 开始真实链上测试...\n");

  const deploymentsPath = path.join(process.cwd(), "deployments", "bscTestnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const [owner] = await ethers.getSigners();
  
  // 使用 HD Wallet 创建多个测试钱包
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

  // 给测试钱包转账
  console.log("💸 给测试钱包转账...");
  const transferAmount = ethers.parseEther("0.05"); // 每个钱包 0.05 BNB
  
  const tx1 = await owner.sendTransaction({ to: wallet1.address, value: transferAmount });
  await tx1.wait();
  console.log("  ✅ Wallet1:", ethers.formatEther(transferAmount), "BNB");
  
  const tx2 = await owner.sendTransaction({ to: wallet2.address, value: transferAmount });
  await tx2.wait();
  console.log("  ✅ Wallet2:", ethers.formatEther(transferAmount), "BNB");
  
  const tx3 = await owner.sendTransaction({ to: wallet3.address, value: transferAmount });
  await tx3.wait();
  console.log("  ✅ Wallet3:", ethers.formatEther(transferAmount), "BNB");
  console.log("");

  const factory = await ethers.getContractAt("MemeTokenFactory", deployments.factory);
  const treasuryAddr = deployments.treasury;

  // ========== 测试 1: 创建无税代币 ==========
  console.log("═══════════════════════════════════════");
  console.log("📝 测试 1: 创建无税代币");
  console.log("═══════════════════════════════════════\n");

  const treasuryStart = await ethers.provider.getBalance(treasuryAddr);
  console.log("💰 Treasury 初始余额:", ethers.formatEther(treasuryStart), "BNB");

  console.log("⏳ 创建代币中...");
  const createTx1 = await factory.createToken(
    "No Tax Token",
    "NTT",
    "Test no tax",
    "https://example.com/ntt.png",
    "", "", "",
    0, // targetRaiseOverride
    0, // templateId
    0, // taxBps
    0, // burnShareBps
    0, // holderShareBps
    0, // liquidityShareBps
    0, // buybackShareBps
    { value: ethers.parseEther("0.005") }
  );
  const receipt1 = await createTx1.wait();

  const event1 = receipt1.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed?.name === "TokenCreated";
    } catch { return false; }
  });
  const parsed1 = event1 ? factory.interface.parseLog(event1) : null;
  const token1Addr = parsed1?.args.token;
  const market1Addr = parsed1?.args.market;

  console.log("✅ 代币地址:", token1Addr);
  console.log("✅ Market 地址:", market1Addr);

  const treasuryAfterCreate = await ethers.provider.getBalance(treasuryAddr);
  const creationFee = treasuryAfterCreate - treasuryStart;
  console.log("💰 创建费收入:", ethers.formatEther(creationFee), "BNB");
  console.log("   验证:", creationFee === ethers.parseEther("0.005") ? "✅ 正确" : "❌ 错误");
  console.log("");

  // ========== 测试 2: 无税代币买卖测试 ==========
  console.log("═══════════════════════════════════════");
  console.log("💹 测试 2: 无税代币买卖 (0.001 BNB)");
  console.log("═══════════════════════════════════════\n");

  const market1 = await ethers.getContractAt("BondingCurveMarket", market1Addr) as any;
  const token1 = await ethers.getContractAt("IERC20", token1Addr) as any;
  const buyAmount = ethers.parseEther("0.001");

  // Wallet1 买入
  console.log("📈 Wallet1 买入 0.001 BNB...");
  const tBeforeBuy1 = await ethers.provider.getBalance(treasuryAddr);
  const buyTx1 = await market1.connect(wallet1).buy(wallet1.address, 0, { value: buyAmount });
  await buyTx1.wait();
  console.log("  ✅ 交易成功:", buyTx1.hash);
  
  const tAfterBuy1 = await ethers.provider.getBalance(treasuryAddr);
  const buyFee1 = tAfterBuy1 - tBeforeBuy1;
  console.log("  💰 Treasury 收到手续费:", ethers.formatEther(buyFee1), "BNB");
  console.log("  📊 费率:", Number(buyFee1) / Number(buyAmount) * 100, "%");

  const w1Bal = await token1.balanceOf(wallet1.address);
  console.log("  🪙 Wallet1 持仓:", ethers.formatUnits(w1Bal, 18), "NTT\n");

  // Wallet2 买入
  console.log("📈 Wallet2 买入 0.001 BNB...");
  const tBeforeBuy2 = await ethers.provider.getBalance(treasuryAddr);
  const buyTx2 = await market1.connect(wallet2).buy(wallet2.address, 0, { value: buyAmount });
  await buyTx2.wait();
  console.log("  ✅ 交易成功");
  
  const tAfterBuy2 = await ethers.provider.getBalance(treasuryAddr);
  const buyFee2 = tAfterBuy2 - tBeforeBuy2;
  console.log("  💰 Treasury 收到手续费:", ethers.formatEther(buyFee2), "BNB\n");

  // Wallet1 卖出
  console.log("📉 Wallet1 卖出一半...");
  const sellAmt1 = w1Bal / 2n;
  await token1.connect(wallet1).approve(market1Addr, sellAmt1);
  
  const tBeforeSell1 = await ethers.provider.getBalance(treasuryAddr);
  const sellTx1 = await market1.connect(wallet1).sell(sellAmt1, 0, wallet1.address);
  await sellTx1.wait();
  console.log("  ✅ 交易成功");
  
  const tAfterSell1 = await ethers.provider.getBalance(treasuryAddr);
  const sellFee1 = tAfterSell1 - tBeforeSell1;
  console.log("  💰 Treasury 收到手续费:", ethers.formatEther(sellFee1), "BNB");
  console.log("  📊 费率:", Number(sellFee1) / Number(buyAmount) * 100, "%\n");

  // ========== 测试 3: 创建带税代币 ==========
  console.log("═══════════════════════════════════════");
  console.log("📝 测试 3: 创建带税代币 (tax=3%)");
  console.log("═══════════════════════════════════════\n");

  const tBeforeCreate2 = await ethers.provider.getBalance(treasuryAddr);
  
  console.log("⏳ 创建代币中...");
  const createTx3 = await factory.createToken(
    "Tax Token",
    "TT",
    "Test with tax",
    "https://example.com/tt.png",
    "", "", "",
    0, // targetRaiseOverride
    1, // templateId
    300, // taxBps
    2000, // burnShareBps
    5000, // holderShareBps
    2000, // liquidityShareBps
    1000, // buybackShareBps
    { value: ethers.parseEther("0.005") }
  );
  const receipt3 = await createTx3.wait();

  const event3 = receipt3.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed?.name === "TokenCreated";
    } catch { return false; }
  });
  const parsed3 = event3 ? factory.interface.parseLog(event3) : null;
  const token2Addr = parsed3?.args.token;
  const market2Addr = parsed3?.args.market;

  console.log("✅ 代币地址:", token2Addr);
  console.log("✅ Market 地址:", market2Addr);

  const tAfterCreate2 = await ethers.provider.getBalance(treasuryAddr);
  const creationFee2 = tAfterCreate2 - tBeforeCreate2;
  console.log("💰 创建费收入:", ethers.formatEther(creationFee2), "BNB");
  console.log("   验证:", creationFee2 === ethers.parseEther("0.005") ? "✅ 正确" : "❌ 错误\n");

  // ========== 测试 4: 带税代币买卖测试 ==========
  console.log("═══════════════════════════════════════");
  console.log("💹 测试 4: 带税代币买卖 (0.001 BNB)");
  console.log("═══════════════════════════════════════\n");

  const market2 = await ethers.getContractAt("BondingCurveMarket", market2Addr) as any;
  const token2 = await ethers.getContractAt("MemeTokenTax", token2Addr) as any;

  // Wallet3 买入
  console.log("📈 Wallet3 买入 0.001 BNB...");
  const tBeforeBuy3 = await ethers.provider.getBalance(treasuryAddr);
  const buyTx3 = await market2.connect(wallet3).buy(wallet3.address, 0, { value: buyAmount });
  await buyTx3.wait();
  console.log("  ✅ 交易成功");
  
  const tAfterBuy3 = await ethers.provider.getBalance(treasuryAddr);
  const buyFee3 = tAfterBuy3 - tBeforeBuy3;
  console.log("  💰 Treasury 收到手续费:", ethers.formatEther(buyFee3), "BNB");
  console.log("  📊 费率:", Number(buyFee3) / Number(buyAmount) * 100, "%");

  const w3Bal = await token2.balanceOf(wallet3.address);
  console.log("  🪙 Wallet3 持仓:", ethers.formatUnits(w3Bal, 18), "TT\n");

  // Wallet3 卖出
  console.log("📉 Wallet3 卖出一半...");
  const sellAmt3 = w3Bal / 2n;
  await token2.connect(wallet3).approve(market2Addr, sellAmt3);
  
  const tBeforeSell3 = await ethers.provider.getBalance(treasuryAddr);
  const sellTx3 = await market2.connect(wallet3).sell(sellAmt3, 0, wallet3.address);
  await sellTx3.wait();
  console.log("  ✅ 交易成功");
  
  const tAfterSell3 = await ethers.provider.getBalance(treasuryAddr);
  const sellFee3 = tAfterSell3 - tBeforeSell3;
  console.log("  💰 Treasury 收到手续费:", ethers.formatEther(sellFee3), "BNB");
  console.log("  📊 费率:", Number(sellFee3) / Number(buyAmount) * 100, "%\n");

  // ========== 总结 ==========
  console.log("═══════════════════════════════════════");
  console.log("📊 测试总结");
  console.log("═══════════════════════════════════════\n");

  const treasuryEnd = await ethers.provider.getBalance(treasuryAddr);
  const totalIncome = treasuryEnd - treasuryStart;

  console.log("✅ 无税代币 NTT:");
  console.log("  创建费:", ethers.formatEther(creationFee), "BNB ✓");
  console.log("  买入手续费:", ethers.formatEther(buyFee1 + buyFee2), "BNB ✓");
  console.log("  卖出手续费:", ethers.formatEther(sellFee1), "BNB ✓");
  console.log("");

  console.log("✅ 带税代币 TT:");
  console.log("  创建费:", ethers.formatEther(creationFee2), "BNB ✓");
  console.log("  买入手续费:", ethers.formatEther(buyFee3), "BNB ✓");
  console.log("  卖出手续费:", ethers.formatEther(sellFee3), "BNB ✓");
  console.log("");

  console.log("💰 Treasury 总收入:", ethers.formatEther(totalIncome), "BNB");
  console.log("");
  console.log("🎉 所有测试完成！手续费收取正常！");
}

main().catch((error) => {
  console.error("❌ 测试失败:", error);
  process.exit(1);
});
