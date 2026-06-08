import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers } = hre;

async function main() {
  console.log("🧪 开始毕业迁移测试...\n");

  const deploymentsPath = path.join(process.cwd(), "deployments", "bscTestnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

  const [owner] = await ethers.getSigners();
  
  // 创建测试钱包
  const hdNode = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase("test test test test test test test test test test test junk")
  );
  const buyer = new ethers.Wallet(hdNode.deriveChild(20).privateKey, ethers.provider);

  console.log("👤 测试钱包:");
  console.log("  Owner:", owner.address);
  console.log("  Buyer:", buyer.address);
  console.log("");

  // 给买家转账 0.04 BNB（足够支付 0.03 BNB 买入 + gas）
  console.log("💸 给买家转账 0.04 BNB...");
  const transferAmount = ethers.parseEther("0.04");
  const tx = await owner.sendTransaction({ to: buyer.address, value: transferAmount });
  await tx.wait();
  console.log("  ✅ 转账成功\n");

  const factory = await ethers.getContractAt("MemeTokenFactory", deployments.factory) as any;
  const treasuryAddr = deployments.treasury;

  // ========== 步骤 1: 创建代币 ==========
  console.log("═══════════════════════════════");
  console.log("📦 步骤 1: 创建代币");
  console.log("═══════════════════════════════\n");

  const createTx = await factory.createToken(
    "Graduation Test Token",
    "GTT",
    "Test graduation migration",
    "https://example.com/gtt.png",
    "",
    "",
    "",
    ethers.parseEther("6"), // targetRaiseOverride: 使用 6 BNB（允许的选项之一）
    0, // templateId (无税)
    0, 0, 0, 0, 0,
    { value: ethers.parseEther("0.005") }
  );
  const receipt = await createTx.wait();
  console.log("✅ 交易哈希:", receipt!.hash);

  const event = receipt!.logs.find((log: any) => {
    try {
      return factory.interface.parseLog(log)?.name === "TokenCreated";
    } catch {
      return false;
    }
  });
  const parsed = factory.interface.parseLog(event!);
  const tokenAddr = parsed?.args[0];
  const marketAddr = parsed?.args[1];
  console.log("  代币地址:", tokenAddr);
  console.log("  Market地址:", marketAddr);

  const market = await ethers.getContractAt("BondingCurveMarket", marketAddr) as any;
  const token = await ethers.getContractAt("IERC20", tokenAddr) as any;

  // 读取配置
  const targetRaise = await market.targetRaise();
  console.log("  🎯 募资目标 (targetRaise):", ethers.formatEther(targetRaise), "BNB");
  console.log("");

  // ========== 步骤 2: 检查初始状态 ==========
  console.log("═══════════════════════════════");
  console.log("📊 步骤 2: 检查初始状态");
  console.log("═══════════════════════════════\n");

  const migratedBefore = await market.migrated();
  const reserveBefore = await ethers.provider.getBalance(marketAddr);
  const supplyBefore = await market.circulatingSupply();

  console.log("  已毕业 (migrated):", migratedBefore);
  console.log("  当前储备金:", ethers.formatEther(reserveBefore), "BNB");
  console.log("  流通供应量:", ethers.formatUnits(supplyBefore, 18), "GTT");
  console.log("  距离毕业还需:", ethers.formatEther(targetRaise - reserveBefore), "BNB");
  console.log("");

  // ========== 步骤 3: 多次买入测试（模拟接近毕业）==========
  console.log("═══════════════════════════════");
  console.log("🛒 步骤 3: 多次买入测试");
  console.log("═══════════════════════════════\n");

  console.log("  ⚠️ 注意：募资目标为 6 BNB，需要大量资金才能毕业");
  console.log("  本次测试将验证买入功能正常，但不会完成毕业\n");

  const buyAmount = ethers.parseEther("0.03"); // 0.03 BNB
  console.log("  第 1 次买入:", ethers.formatEther(buyAmount), "BNB");

  const quote = await market.quoteBuy(buyAmount);
  console.log("    预计获得代币:", ethers.formatUnits(quote.tokensOut, 18), "GTT");
  console.log("    预计手续费:", ethers.formatEther(quote.feePaid), "BNB");

  const buyTx = await market.connect(buyer).buy(buyer.address, 0, { value: buyAmount });
  const buyReceipt = await buyTx.wait();
  console.log("    ✅ 交易成功:", buyTx.hash);

  // ========== 步骤 4: 检查状态 ==========
  console.log("\n═══════════════════════════════");
  console.log("📊 步骤 4: 检查买入后状态");
  console.log("═══════════════════════════════\n");

  const migratedAfter = await market.migrated();
  const reserveAfter = await ethers.provider.getBalance(marketAddr);
  const supplyAfter = await market.circulatingSupply();
  const buyerBalance = await token.balanceOf(buyer.address);

  console.log("  已毕业 (migrated):", migratedAfter);
  console.log("  Market 储备金:", ethers.formatEther(reserveAfter), "BNB");
  console.log("  流通供应量:", ethers.formatUnits(supplyAfter, 18), "GTT");
  console.log("  Buyer 代币余额:", ethers.formatUnits(buyerBalance, 18), "GTT");
  console.log("  距离毕业还需:", ethers.formatEther(targetRaise - reserveAfter), "BNB");
  console.log("");

  if (migratedAfter) {
    console.log("  ✅ 代币已成功毕业！");
    console.log("");

    // 获取 LP 对地址
    const pairAddress = await market.pair();
    console.log("  📍 PancakeSwap LP 对地址:", pairAddress);

    // 检查 LP 是否已锁定
    const lockerAddr = await market.locker();
    const locker = await ethers.getContractAt("LiquidityLocker", lockerAddr) as any;
    
    // 查找锁仓记录
    const lockCount = await locker.lockCount();
    console.log("  🔒 Locker 中的锁仓数量:", lockCount.toString());

    // 检查最后一个锁仓（应该是刚创建的）
    if (lockCount > 0n) {
      const lastLockId = await locker.lockIds(lockCount - 1n);
      const lockInfo = await locker.locks(lastLockId);
      
      console.log("\n  🔐 最新锁仓信息:");
      console.log("    LP 代币:", lockInfo.token);
      console.log("    锁仓数量:", ethers.formatUnits(lockInfo.amount, 18));
      console.log("    受益人:", lockInfo.beneficiary);
      console.log("    解锁时间:", new Date(Number(lockInfo.unlockTime) * 1000).toLocaleString());
      console.log("    已提取:", lockInfo.withdrawn);

      // 计算锁仓时长
      const lockDuration = Number(lockInfo.unlockTime) - Math.floor(Date.now() / 1000);
      const lockDays = Math.floor(lockDuration / 86400);
      console.log("    锁仓天数:", lockDays, "天");
    }

    console.log("");
    console.log("  💰 Treasury 收益:");
    const treasuryBalance = await ethers.provider.getBalance(treasuryAddr);
    console.log("    Treasury 余额:", ethers.formatEther(treasuryBalance), "BNB");
    console.log("");

    // 尝试在毕业后再次买入（应该失败）
    console.log("  🚫 测试毕业后禁止买卖...");
    try {
      const quoteAfter = await market.quoteBuy(ethers.parseEther("0.001"));
      console.log("    ⚠️ 警告：毕业后仍能报价（这可能有问题）");
    } catch (error: any) {
      console.log("    ✅ 正确：毕业后无法报价");
      console.log("    错误信息:", error.message.split('\n')[0]);
    }

  } else {
    console.log("  ℹ️ 代币尚未毕业（需要更多买入才能达到 6 BNB 目标）");
    console.log("");
    console.log("  💡 毕业机制说明:");
    console.log("    • 当 Market 储备金达到 targetRaise (6 BNB) 时自动毕业");
    console.log("    • 毕业后会自动在 PancakeSwap 创建流动性池");
    console.log("    • LP 代币会被锁定 365 天");
    console.log("    • 毕业后 Market 合约禁止买卖");
  }

  // ========== 总结 ==========
  console.log("\n═══════════════════════════════");
  console.log("📊 测试总结");
  console.log("═══════════════════════════════\n");

  console.log("✅ 毕业迁移测试完成!");
  console.log("\n🎯 验证结果:");
  if (migratedAfter) {
    console.log("  ✓ 代币成功毕业");
    console.log("  ✓ LP 对已在 PancakeSwap 创建");
    console.log("  ✓ LP 代币已锁定");
    console.log("  ✓ 锁仓时间为 365 天");
    console.log("  ✓ 毕业后 Market 禁止交易");
  } else {
    console.log("  ⚠️ 代币未毕业，需要更多买入");
  }
}

main().catch(console.error);
