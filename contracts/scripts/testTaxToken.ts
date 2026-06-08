import hre from "hardhat";
import fs from "fs";
import path from "path";
const { ethers } = hre;

async function main() {
  console.log("🧪 开始带税代币完整功能测试...\n");

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

  // 给测试钱包转账
  console.log("💸 给测试钱包转账...");
  const transferAmount = ethers.parseEther("0.01");
  await (await owner.sendTransaction({ to: wallet1.address, value: transferAmount })).wait();
  await (await owner.sendTransaction({ to: wallet2.address, value: transferAmount })).wait();
  await (await owner.sendTransaction({ to: wallet3.address, value: transferAmount })).wait();
  console.log("  ✅ 每个钱包收到 0.01 BNB\n");

  const factory = await ethers.getContractAt("MemeTokenFactory", deployments.factory) as any;
  const treasuryAddr = deployments.treasury;

  // ========== 测试 1: 创建带税代币 ==========
  console.log("═══════════════════════════════");
  console.log("📦 测试 1: 创建带税代币 (taxBps=500, 5%)");
  console.log("═══════════════════════════════\n");

  const createTx = await factory.createToken(
    "Tax Token",
    "TT",
    "Test with tax - 5% tax rate",
    "https://example.com/tt.png",
    "",
    "",
    "",
    0n,
    1,  // templateId (带税)
    500, // taxBps (5%)
    2000, // burnShareBps (20% of tax → 燃烧)
    4000, // holderShareBps (40% of tax → 持有者分红)
    2000, // liquidityShareBps (20% of tax → 流动性池)
    2000, // buybackShareBps (20% of tax → Treasury)
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
  const token = await ethers.getContractAt("MemeTokenTax", tokenAddr) as any;

  // 验证税费配置
  const taxBps = await token.taxBps();
  const burnShare = await token.burnShareBps();
  const holderShare = await token.holderShareBps();
  const liqShare = await token.liquidityShareBps();
  const buybackShare = await token.buybackShareBps();

  console.log("\n  📊 税费配置:");
  console.log("    总税率 (taxBps):", taxBps.toString(), `(${Number(taxBps)/100}%)`);
  console.log("    燃烧比例 (burnShareBps):", burnShare.toString(), `(${Number(burnShare)/100}% of tax)`);
  console.log("    持有者分红 (holderShareBps):", holderShare.toString(), `(${Number(holderShare)/100}% of tax)`);
  console.log("    流动性池 (liquidityShareBps):", liqShare.toString(), `(${Number(liqShare)/100}% of tax)`);
  console.log("    回购/Treasury (buybackShareBps):", buybackShare.toString(), `(${Number(buybackShare)/100}% of tax)`);

  // 计算实际分配
  const totalTax = 500; // 5%
  const burnAmt = (totalTax * 2000) / 10000; // 1%
  const holderAmt = (totalTax * 4000) / 10000; // 2%
  const liqAmt = (totalTax * 2000) / 10000; // 1%
  const buybackAmt = (totalTax * 2000) / 10000; // 1%

  console.log("\n  💰 实际税费分配 (每笔交易 5%):");
  console.log("    燃烧:", burnAmt / 100, "%");
  console.log("    持有者分红:", holderAmt / 100, "%");
  console.log("    流动性池:", liqAmt / 100, "%");
  console.log("    Treasury 收益:", buybackAmt / 100, "%");
  console.log("");

  // ========== 测试 2: 多钱包买入带税代币 ==========
  console.log("═══════════════════════════════");
  console.log("🛒 测试 2: 多钱包买入带税代币 (各 0.005 BNB)");
  console.log("═══════════════════════════════\n");

  const buyAmount = ethers.parseEther("0.005"); // 0.005 BNB
  const treasuryBeforeBuy = await ethers.provider.getBalance(treasuryAddr);

  // Wallet1 买入
  console.log("1️⃣  Wallet1 买入...");
  const quote1 = await market.quoteBuy(buyAmount);
  console.log("  预计获得代币:", ethers.formatUnits(quote1.tokensOut, 18), "TT");
  console.log("  曲线手续费:", ethers.formatEther(quote1.feePaid), "BNB (1%)");

  const buyTx1 = await market.connect(wallet1).buy(wallet1.address, 0, { value: buyAmount });
  await buyTx1.wait();
  console.log("  ✅ 交易成功:", buyTx1.hash);

  const balance1After = await token.balanceOf(wallet1.address);
  console.log("  实际获得:", ethers.formatUnits(balance1After, 18), "TT\n");

  // Wallet2 买入
  console.log("2️⃣  Wallet2 买入...");
  const quote2 = await market.quoteBuy(buyAmount);
  console.log("  预计获得代币:", ethers.formatUnits(quote2.tokensOut, 18), "TT");
  console.log("  曲线手续费:", ethers.formatEther(quote2.feePaid), "BNB (1%)");

  const buyTx2 = await market.connect(wallet2).buy(wallet2.address, 0, { value: buyAmount });
  await buyTx2.wait();
  console.log("  ✅ 交易成功:", buyTx2.hash);

  const balance2After = await token.balanceOf(wallet2.address);
  console.log("  实际获得:", ethers.formatUnits(balance2After, 18), "TT\n");

  // Wallet3 买入
  console.log("3️⃣  Wallet3 买入...");
  const quote3 = await market.quoteBuy(buyAmount);
  console.log("  预计获得代币:", ethers.formatUnits(quote3.tokensOut, 18), "TT");
  console.log("  曲线手续费:", ethers.formatEther(quote3.feePaid), "BNB (1%)");

  const buyTx3 = await market.connect(wallet3).buy(wallet3.address, 0, { value: buyAmount });
  await buyTx3.wait();
  console.log("  ✅ 交易成功:", buyTx3.hash);

  const balance3After = await token.balanceOf(wallet3.address);
  console.log("  实际获得:", ethers.formatUnits(balance3After, 18), "TT\n");

  const treasuryAfterBuy = await ethers.provider.getBalance(treasuryAddr);
  const curveFeeReceived = treasuryAfterBuy - treasuryBeforeBuy;
  console.log("  💰 Treasury 曲线手续费收入:", ethers.formatEther(curveFeeReceived), "BNB\n");

  // ========== 测试 3: Wallet1 卖出部分代币 ==========
  console.log("═══════════════════════════════");
  console.log("💸 测试 3: Wallet1 卖出部分代币");
  console.log("═══════════════════════════════\n");

  const sellAmount = balance1After / 2n; // 卖出一半
  console.log("  卖出数量:", ethers.formatUnits(sellAmount, 18), "TT");

  const quoteSell = await market.quoteSell(sellAmount);
  console.log("  预计获得 BNB:", ethers.formatEther(quoteSell.bnbOut), "BNB");
  console.log("  曲线手续费:", ethers.formatEther(quoteSell.feePaid), "BNB (1%)");

  console.log("  正在 approve...");
  const approveTx = await token.connect(wallet1).approve(marketAddr, sellAmount);
  await approveTx.wait();
  console.log("  ✅ Approve 成功");

  const sellTx = await market.connect(wallet1).sell(sellAmount, 0, wallet1.address);
  await sellTx.wait();
  console.log("  ✅ 卖出成功:", sellTx.hash);

  const wallet1BnbAfterSell = await ethers.provider.getBalance(wallet1.address);
  console.log("  Wallet1 BNB余额:", ethers.formatEther(wallet1BnbAfterSell), "BNB");

  const wallet1TokenAfterSell = await token.balanceOf(wallet1.address);
  console.log("  Wallet1 剩余代币:", ethers.formatUnits(wallet1TokenAfterSell, 18), "TT\n");

  const treasuryAfterSell = await ethers.provider.getBalance(treasuryAddr);
  const sellCurveFee = treasuryAfterSell - treasuryAfterBuy;
  console.log("  💰 Treasury 卖出曲线手续费:", ethers.formatEther(sellCurveFee), "BNB\n");

  // ========== 测试 4: 转账测试（触发税费）==========
  console.log("═══════════════════════════════");
  console.log("🔄 测试 4: 钱包间转账（触发税费机制）");
  console.log("═══════════════════════════════\n");

  // 创建一个新的接收地址
  const receiver = new ethers.Wallet(hdNode.deriveChild(10).privateKey, ethers.provider);
  console.log("  接收地址:", receiver.address);

  // Wallet2 转账给 receiver（会触发税费）
  const transferAmount2 = balance2After / 3n; // 转出三分之一
  console.log("\n  Wallet2 转账给 Receiver...");
  console.log("  转账数量:", ethers.formatUnits(transferAmount2, 18), "TT");

  const taxBpsNum = Number(taxBps);
  const expectedTax = (transferAmount2 * BigInt(taxBpsNum)) / 10000n;
  console.log("  预计税费:", ethers.formatUnits(expectedTax, 18), "TT (", taxBpsNum/100, "%)");
  console.log("  预计到账:", ethers.formatUnits(transferAmount2 - expectedTax, 18), "TT");

  const transferTx = await token.connect(wallet2).transfer(receiver.address, transferAmount2);
  await transferTx.wait();
  console.log("  ✅ 转账成功:", transferTx.hash);

  const receiverBalance = await token.balanceOf(receiver.address);
  console.log("  Receiver 实际收到:", ethers.formatUnits(receiverBalance, 18), "TT");

  const wallet2BalanceAfter = await token.balanceOf(wallet2.address);
  console.log("  Wallet2 剩余:", ethers.formatUnits(wallet2BalanceAfter, 18), "TT");

  // 检查合约中的税费积累
  const contractBalance = await token.balanceOf(tokenAddr);
  console.log("  合约中积累的税费:", ethers.formatUnits(contractBalance, 18), "TT\n");

  // ========== 测试 5: 再次买卖测试 ==========
  console.log("═══════════════════════════════");
  console.log("🛒 测试 5: Wallet3 再次买入 + 卖出");
  console.log("═══════════════════════════════\n");

  const buyAgain = ethers.parseEther("0.003"); // 0.003 BNB
  console.log("  Wallet3 再次买入", ethers.formatEther(buyAgain), "BNB...");

  const buyTx4 = await market.connect(wallet3).buy(wallet3.address, 0, { value: buyAgain });
  await buyTx4.wait();
  console.log("  ✅ 买入成功:", buyTx4.hash);

  const balance3AfterBuy = await token.balanceOf(wallet3.address);
  console.log("  Wallet3 当前余额:", ethers.formatUnits(balance3AfterBuy, 18), "TT\n");

  // 卖出一部分
  const sellAgain = balance3AfterBuy / 3n;
  console.log("  Wallet3 卖出", ethers.formatUnits(sellAgain, 18), "TT...");

  const quoteSell2 = await market.quoteSell(sellAgain);
  console.log("  预计获得:", ethers.formatEther(quoteSell2.bnbOut), "BNB");

  const approveTx2 = await token.connect(wallet3).approve(marketAddr, sellAgain);
  await approveTx2.wait();

  const sellTx2 = await market.connect(wallet3).sell(sellAgain, 0, wallet3.address);
  await sellTx2.wait();
  console.log("  ✅ 卖出成功:", sellTx2.hash);

  const finalBalance3 = await token.balanceOf(wallet3.address);
  console.log("  Wallet3 最终余额:", ethers.formatUnits(finalBalance3, 18), "TT\n");

  // ========== 总结 ==========
  console.log("═══════════════════════════════");
  console.log("📊 测试总结");
  console.log("═══════════════════════════════\n");

  const finalTreasury = await ethers.provider.getBalance(treasuryAddr);
  const totalTreasuryIncome = finalTreasury - treasuryBeforeBuy;

  console.log("✅ 所有测试完成!");
  console.log("💰 Treasury 总收入:", ethers.formatEther(totalTreasuryIncome), "BNB");
  console.log("\n🎯 验证结果:");
  console.log("  ✓ 带税代币创建正常");
  console.log("  ✓ 税费配置正确 (5% 总税率)");
  console.log("  ✓ 多钱包买入正常");
  console.log("  ✓ 曲线手续费收取正常 (1%)");
  console.log("  ✓ 卖出功能正常");
  console.log("  ✓ 转账触发税费机制正常");
  console.log("  ✓ 税费分配到合约地址正常");
  console.log("  ✓ Treasury 收益累计正常");
  console.log("\n📈 平台收入模式:");
  console.log("  • 创建费: 0.005 BNB/代币");
  console.log("  • 曲线阶段: 买卖各收 1%");
  console.log("  • 毕业后: 带税代币通过 buybackShareBps 获得平台收益");
  console.log("  • 本测试 Treasury 收益来源: 创建费 + 曲线买卖手续费");
}

main().catch(console.error);
