import hre from "hardhat"
import { ethers } from "hardhat"

const { run } = hre

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 1) {
    console.log("用法: npx hardhat run scripts/verifyLatestToken.ts --network bsc [txHash]")
    console.log("  txHash: 创建代币的交易哈希（可选，不提供则检查最近的 Factory 事件）")
    process.exit(1)
  }
  
  const txHash = args[0]
  
  console.log(`开始验证最新创建的代币合约`)
  
  // 获取网络信息
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)
  
  if (chainId !== 56 && chainId !== 97) {
    console.log(`⚠️  当前网络不是 BSC 主网或测试网，跳过验证`)
    process.exit(0)
  }
  
  // 读取部署配置获取 Factory 地址
  const fs = await import('fs/promises')
  const path = await import('path')
  const deploymentFile = path.join(process.cwd(), 'deployments', chainId === 56 ? 'bsc.json' : 'bscTestnet.json')
  
  let factoryAddress: string
  try {
    const deploymentData = JSON.parse(await fs.readFile(deploymentFile, 'utf-8'))
    factoryAddress = deploymentData.factory
    console.log(`Factory 地址: ${factoryAddress}`)
  } catch (e) {
    console.error(`❌ 无法读取部署文件: ${deploymentFile}`)
    process.exit(1)
  }
  
  // 获取 Factory 合约实例
  const factoryArtifact = await import('../artifacts/contracts/MemeTokenFactory.sol/MemeTokenFactory.json')
  const factory = new ethers.Contract(factoryAddress, factoryArtifact.abi, ethers.provider)
  
  let tokenAddress: string
  let templateId: number
  
  if (txHash) {
    // 从指定的交易哈希中获取
    console.log(`\n解析交易: ${txHash}`)
    const receipt = await ethers.provider.getTransactionReceipt(txHash)
    
    if (!receipt) {
      console.error(`❌ 交易未找到: ${txHash}`)
      process.exit(1)
    }
    
    // 查找 TokenCreated 事件
    const tokenCreatedTopic = ethers.id("TokenCreated(address,address,uint8)")
    const log = receipt.logs.find(l => l.topics[0] === tokenCreatedTopic)
    
    if (!log) {
      console.error(`❌ 交易中未找到 TokenCreated 事件`)
      process.exit(1)
    }
    
    const decoded = factory.interface.parseLog(log)
    tokenAddress = decoded?.args[1] // token address
    templateId = decoded?.args[2]   // templateId
    
    console.log(`  代币地址: ${tokenAddress}`)
    console.log(`  模板 ID: ${templateId}`)
  } else {
    // 获取最近的 TokenCreated 事件
    console.log(`\n查询最近的 TokenCreated 事件...`)
    
    const filter = factory.filters.TokenCreated()
    const events = await factory.queryFilter(filter, -100) // 最近 100 个区块
    
    if (events.length === 0) {
      console.log(`⚠️  未找到任何 TokenCreated 事件`)
      process.exit(0)
    }
    
    const latestEvent = events[events.length - 1]
    const decoded = factory.interface.parseLog(latestEvent)
    tokenAddress = decoded?.args[1]
    templateId = decoded?.args[2]
    
    console.log(`  代币地址: ${tokenAddress}`)
    console.log(`  模板 ID: ${templateId}`)
    console.log(`  区块号: ${latestEvent.blockNumber}`)
  }
  
  // 验证合约
  console.log(`\n开始验证合约...`)
  
  try {
    const contractPath = templateId === 0 
      ? "contracts/MemeToken.sol:MemeToken"
      : "contracts/MemeTokenTax.sol:MemeTokenTax"
    
    console.log(`合约类型: ${templateId === 0 ? "无税(MemeToken)" : "有税(MemeTokenTax)"}`)
    console.log(`合约路径: ${contractPath}`)
    
    await run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [],
      contract: contractPath
    })
    
    console.log(`\n✅ 合约验证成功!`)
    console.log(`   地址: ${tokenAddress}`)
    console.log(`   BSCScan: https://${chainId === 56 ? 'bscscan.com' : 'testnet.bscscan.com'}/address/${tokenAddress}#code`)
  } catch (e: any) {
    if (e.message.includes("Already Verified")) {
      console.log(`\n✓ 合约已验证`)
      console.log(`   地址: ${tokenAddress}`)
    } else {
      console.error(`\n❌ 合约验证失败`)
      console.error(`   错误: ${e.message}`)
      console.error(`\n提示: 可能需要等待几分钟让 BSCScan 索引交易`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
