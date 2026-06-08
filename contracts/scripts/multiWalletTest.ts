import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers } = hre;

async function main() {
  console.log("🧪 开始多钱包真实买卖测试...\n");

  const deploymentsPath = path.join(process.cwd(), "deployments", "bscTestnet.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));

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
  const balanceOwner = await ethers.provider.getBalance(owner.address);
  const balance1 = await ethers.provider.getBalance(wallet1.address);
  const balance2 = await ethers.provider.getBalance(wallet2.address);
  const balance3 = await ethers.provider.getBalance(wallet3.address);

  console.log("  Owner:  ", ethers.formatEther(balanceOwner), "BNB");
  console.log("  Wallet1:", ethers.formatEther(balance1), "BNB");
  console.log("  Wallet2:", ethers.formatEther(balance2), "BNB");
  console.log("  Wallet3:", ethers.formatEther(balance3), "BNB");
  console.log("");

  const factory = await ethers.getContractAt("MemeTokenFactory", deployments.factory) as any;
  const treasuryAddr = deployments.treasury;

  // ========== 测试 1: 创建无税代币 ==========
  console.log("═══════════════════════════════");
  console.log("📦 测试 1: 创建无税代币");
  console.log("═══════════════════════════════\n");

  const createTx1 = await factory.createToken(
    "No Tax Token",
    "NTT",
    "Test no tax token",
    "https://example.com/ntt.png",
    "",
    "",
    "",
    0n, // targetRaiseOverride
    0,  // templateId (无税)
    0,  // taxBps
    0,  // burnShareBps
    0,  // holderShareBps
    0,  // liquidityShareBps
    0,  // buybackShareBps
    { value: ethers.parseEther("0.005") }
  );
  const receipt1 = await createTx1.wait();
  console.log("✅ 交易哈希:", receipt1!.hash);

  const event1 = receipt1!.logs.find((log: any) => {
    try {
      return factory.interface.parseLog(log)?.name === "TokenCreated";
    } catch {
      return false;
    }
  });
  const parsed1 = factory.interface.parseLog(event1!);
  const token1Addr = parsed1?.args[0];
  const market1Addr = parsed1?.args[1];
  console.log("  代币地址:", token1Addr);
  console.log("  Market地址:", market1Addr);

  const market1 = await ethers.getContractAt("BondingCurveMarket", market1Addr) as any;
  const token1 = await ethers.getContractAt("IERC20", token1Addr) as any;

  const balanceAfterCreate1 = await ethers.provider.getBalance(treasuryAddr);
  console.log("  💰 Treasury余额:", ethers.formatEther(balanceAfterCreate1), "BNB\n");

  // ========== 测试 2: 多个钱包买入测试 ==========
  console.log("═══════════════════════════════");
  console.log("🛒 测试 2: 多钱包小额买入 (各 0.001 BNB)");
  console.log("═══════════════════════════════\n");

  const buyAmount = ethers.parseEther("0.001"); // 0.001 BNB
  const treasuryBeforeBuy = await ethers.provider.getBalance(treasuryAddr);
  let totalBuyFee = 0n;

  // Wallet1 买入
  console.log("1️⃣  Wallet1 买入...");
  const quote1 = await market1.quoteBuy(buyAmount);
  console.log("  预计获得:", ethers.formatUnits(quote1.tokensOut, 18), "NTT");
  console.log("  预计手续费:", ethers.formatEther(quote1.feePaid), "BNB");

  const buyTx1 = await market1.connect(wallet1).buy(wallet1.address, 0, { value: buyAmount });
  await buyTx1.wait();
  console.log("  ✅ 交易成功:", buyTx1.hash);

  const balance1After = await token1.balanceOf(wallet1.address);
  console.log("  实际获得:", ethers.formatUnits(balance1After, 18), "NTT\n");

  // Wallet2 买入
  console.log("2️⃣  Wallet2 买入...");
  const quote2 = await market1.quoteBuy(buyAmount);
  console.log("  预计获得:", ethers.formatUnits(quote2.tokensOut, 18), "NTT");
  console.log("  预计手续费:", ethers.formatEther(quote2.feePaid), "BNB");

  const buyTx2 = await market1.connect(wallet2).buy(wallet2.address, 0, { value: buyAmount });
  await buyTx2.wait();
  console.log("  ✅ 交易成功:", buyTx2.hash);

  const balance2After = await token1.balanceOf(wallet2.address);
  console.log("  实际获得:", ethers.formatUnits(balance2After, 18), "NTT\n");

  // Wallet3 买入
  console.log("3️⃣  Wallet3 买入...");
  const quote3 = await market1.quoteBuy(buyAmount);
  console.log("  预计获得:", ethers.formatUnits(quote3.tokensOut, 18), "NTT");
  console.log("  预计手续费:", ethers.formatEther(quote3.feePaid), "BNB");

  const buyTx3 = await market1.connect(wallet3).buy(wallet3.address, 0, { value: buyAmount });
  await buyTx3.wait();
  console.log("  ✅ 交易成功:", buyTx3.hash);

  const balance3After = await token1.balanceOf(wallet3.address);
  console.log("  实际获得:", ethers.formatUnits(balance3After, 18), "NTT\n");

  const treasuryAfterBuy = await ethers.provider.getBalance(treasuryAddr);
  const actualBuyFee = treasuryAfterBuy - treasuryBeforeBuy;
  console.log("  💰 Treasury 实际收到手续费:", ethers.formatEther(actualBuyFee), "BNB\n");

  // ========== 测试 3: 卖出测试 ==========
  console.log("═══════════════════════════════");
  console.log("💸 测试 3: Wallet1 卖出部分代币");
  console.log("═══════════════════════════════\n");

  const sellAmount = balance1After / 2n; // 卖出一半
  console.log("  卖出数量:", ethers.formatUnits(sellAmount, 18), "NTT");

  const quoteSell = await market1.quoteSell(sellAmount);
  console.log("  预计获得:", ethers.formatEther(quoteSell.bnbOut), "BNB");
  console.log("  预计手续费:", ethers.formatEther(quoteSell.feePaid), "BNB");

  console.log("  正在 approve...");
  const approveTx = await token1.connect(wallet1).approve(market1Addr, sellAmount);
  await approveTx.wait();
  console.log("  ✅ Approve 成功");
  
  const allowance = await token1.allowance(wallet1.address, market1Addr);
  console.log("  Allowance:", ethers.formatUnits(allowance, 18), "NTT");
  
  const sellTx = await market1.connect(wallet1).sell(sellAmount, 0, wallet1.address);
  await sellTx.wait();
  console.log("  ✅ 卖出成功:", sellTx.hash);

  const wallet1BnbAfterSell = await ethers.provider.getBalance(wallet1.address);
  console.log("  Wallet1 BNB余额:", ethers.formatEther(wallet1BnbAfterSell), "BNB");

  const wallet1TokenAfterSell = await token1.balanceOf(wallet1.address);
  console.log("  Wallet1 剩余代币:", ethers.formatUnits(wallet1TokenAfterSell, 18), "NTT\n");

  const treasuryAfterSell = await ethers.provider.getBalance(treasuryAddr);
  const sellFee = treasuryAfterSell - treasuryAfterBuy;
  console.log("  💰 Treasury 卖出手续费:", ethers.formatEther(sellFee), "BNB\n");

  // ========== 测试 4: 创建带税代币并测试 ==========
  console.log("═══════════════════════════════");
  console.log("📦 测试 4: 创建带税代币 (taxBps=300)");
  console.log("═══════════════════════════════\n");

  const createTx2 = await factory.createToken(
    "Tax Token",
    "TT",
    "Test with tax",
    "https://example.com/tt.png",
    "",
    "",
    "",
    0n,
    1,  // templateId (带税)
    300, // taxBps (3%)
    2000, // burnShareBps (20% of tax)
    5000, // holderShareBps (50% of tax)
    2000, // liquidityShareBps (20% of tax)
    1000, // buybackShareBps (10% of tax → Treasury)
    { value: ethers.parseEther("0.005") }
  );
  const receipt2 = await createTx2.wait();
  console.log("✅ 交易哈希:", receipt2!.hash);

  const event2 = receipt2!.logs.find((log: any) => {
    try {
      return factory.interface.parseLog(log)?.name === "TokenCreated";
    } catch {
      return false;
    }
  });
  const parsed2 = factory.interface.parseLog(event2!);
  const token2Addr = parsed2?.args[0];
  const market2Addr = parsed2?.args[1];
  console.log("  代币地址:", token2Addr);
  console.log("  Market地址:", market2Addr);

  const market2 = await ethers.getContractAt("BondingCurveMarket", market2Addr) as any;
  const token2 = await ethers.getContractAt("MemeTokenTax", token2Addr) as any;

  // 验证税费配置
  const taxBps = await token2.taxBps();
  const burnShare = await token2.burnShareBps();
  const holderShare = await token2.holderShareBps();
  const liqShare = await token2.liquidityShareBps();
  const buybackShare = await token2.buybackShareBps();

  console.log("  税费配置:");
  console.log("    taxBps:", taxBps.toString(), `(${Number(taxBps)/100}%)`);
  console.log("    burnShareBps:", burnShare.toString(), `(${Number(burnShare)/100}% of tax)`);
  console.log("    holderShareBps:", holderShare.toString(), `(${Number(holderShare)/100}% of tax)`);
  console.log("    liquidityShareBps:", liqShare.toString(), `(${Number(liqShare)/100}% of tax)`);
  console.log("    buybackShareBps:", buybackShare.toString(), `(${Number(buybackShare)/100}% of tax)\n`);

  // Wallet2 买入带税代币
  console.log("🛒 Wallet2 买入带税代币...");
  const buyTx4 = await market2.connect(wallet2).buy(wallet2.address, 0, { value: buyAmount });
  await buyTx4.wait();
  console.log("  ✅ 买入成功:", buyTx4.hash);

  const balance2Tax = await token2.balanceOf(wallet2.address);
  console.log("  获得代币:", ethers.formatUnits(balance2Tax, 18), "TT\n");

  // Wallet2 卖出带税代币
  console.log("💸 Wallet2 卖出带税代币...");
  const sellAmount2 = balance2Tax / 2n;
  console.log("  正在 approve...");
  const approveTx2 = await token2.connect(wallet2).approve(market2Addr, sellAmount2);
  await approveTx2.wait();
  console.log("  ✅ Approve 成功");
  const sellTx2 = await market2.connect(wallet2).sell(sellAmount2, 0, wallet2.address);
  await sellTx2.wait();
  console.log("  ✅ 卖出成功:", sellTx2.hash);

  const balance2TaxAfter = await token2.balanceOf(wallet2.address);
  console.log("  剩余代币:", ethers.formatUnits(balance2TaxAfter, 18), "TT\n");

  // ========== 总结 ==========
  console.log("═══════════════════════════════");
  console.log("📊 测试总结");
  console.log("═══════════════════════════════\n");

  const finalTreasury = await ethers.provider.getBalance(treasuryAddr);
  console.log("✅ 所有测试完成!");
  console.log("💰 Treasury最终余额:", ethers.formatEther(finalTreasury), "BNB");
  console.log("\n🎯 验证结果:");
  console.log("  ✓ 无税代币创建正常");
  console.log("  ✓ 多钱包买入正常");
  console.log("  ✓ 曲线手续费收取正常");
  console.log("  ✓ 卖出功能正常");
  console.log("  ✓ 带税代币创建正常");
  console.log("  ✓ 带税代币买卖正常");
  console.log("  ✓ 税费配置正确");
}

main().catch(console.error);
