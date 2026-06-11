import hre from "hardhat"
const { ethers, run } = hre

async function verifyContract(config: any): Promise<boolean> {
  console.log(`\n尝试验证合约: ${config.address}`)
  
  try {
    await run("verify:verify", config)
    console.log(`✅ 合约验证成功: ${config.address}`)
    return true
  } catch (e: any) {
    if (e.message.includes("Already Verified")) {
      console.log(`✓ 合约已验证: ${config.address}`)
      return true
    } else {
      console.error(`❌ 合约验证失败: ${config.address}`)
      console.error(`   错误信息: ${e.message}`)
      return false
    }
  }
}

async function main() {
  console.log("开始批量验证已部署的代币合约...\n")
  
  // 从 API 获取代币列表
  const response = await fetch("https://clawlaunch-web.vercel.app/api/tokens")
  const data = await response.json()
  const tokens = data.data.list
  
  console.log(`找到 ${tokens.length} 个代币\n`)
  
  const factoryAddress = "0x6066e43888D8779322e9ab5dF151b26402807711"
  const factory = await ethers.getContractAt("MemeTokenFactory", factoryAddress)
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    console.log(`\n[${i + 1}/${tokens.length}] 处理代币: ${token.token}`)
    console.log(`  类型: ${token.templateId === 0 ? "无税(MemeToken)" : "有税(MemeTokenTax)"}`)
    
    try {
      // 获取代币信息
      const tokenContract = await ethers.getContractAt(
        token.templateId === 0 ? "MemeToken" : "MemeTokenTax",
        token.token
      )
      
      const name = await tokenContract.name()
      const symbol = await tokenContract.symbol()
      const totalSupply = await tokenContract.totalSupply()
      
      console.log(`  名称: ${name}`)
      console.log(`  符号: ${symbol}`)
      console.log(`  总供应量: ${ethers.formatUnits(totalSupply, 18)}`)
      
      // 验证代币合约
      if (token.templateId === 0) {
        await verifyContract({
          address: token.token,
          constructorArguments: [name, symbol, totalSupply, factoryAddress, factoryAddress],
          contract: "contracts/MemeToken.sol:MemeToken"
        })
      } else {
        const treasury = await factory.treasury();
        const wbnb = await factory.wbnb();
        const router = await factory.router();
        
        await verifyContract({
          address: token.token,
          constructorArguments: [
            name,
            symbol,
            totalSupply,
            factoryAddress,
            factoryAddress,
            treasury,
            wbnb,
            router,
            token.taxBps,
            token.burnShareBps,
            token.holderShareBps,
            token.liquidityShareBps,
            token.buybackShareBps
          ],
          contract: "contracts/MemeTokenTax.sol:MemeTokenTax"
        })
      }
      
      // 验证 Market 合约
      console.log(`\n  验证 Market 合约: ${token.market}`)
      const locker = await factory.locker();
      const targetRaise = token.targetRaiseOverride === "0" ? 
        await factory.targetRaise() : 
        BigInt(token.targetRaiseOverride);
      
      await verifyContract({
        address: token.market,
        constructorArguments: [
          token.token,
          token.creator,
          await factory.treasury(),
          targetRaise,
          await factory.buyFeeBps(),
          await factory.sellFeeBps(),
          await factory.virtualBnbReserve(),
          (totalSupply * 2000n) / 10000n, // liquidityTokenReserve
          await factory.antiSnipingDelaySeconds(),
          await factory.wbnb(),
          await factory.router(),
          locker
        ],
        contract: "contracts/BondingCurveMarket.sol:BondingCurveMarket"
      })
      
      // 等待一下避免速率限制
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error) {
      console.error(`❌ 处理代币 ${token.token} 时出错:`, error)
    }
  }
  
  console.log("\n✅ 批量验证完成!")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
