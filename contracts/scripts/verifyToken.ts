import hre from "hardhat"
import { ethers } from "hardhat"

const { run } = hre

interface VerifyConfig {
  address: string
  constructorArguments: any[]
  contract?: string
}

async function verifyContract(config: VerifyConfig): Promise<boolean> {
  console.log(`\n尝试验证合约: ${config.address}`)
  
  try {
    await run("verify:verify", config)
    console.log(`✅ 合约验证成功: ${config.address}`)
    return true
  } catch (e: any) {
    if (e.message.includes("Already Verified")) {
      console.log(`✓ 合约已验证: ${config.address}`)
      return true
    } else if (e.message.includes("Contract source code not found")) {
      console.log(`⚠️  合约源码未找到（可能使用了 Sourcify）: ${config.address}`)
      return false
    } else {
      console.error(`❌ 合约验证失败: ${config.address}`)
      console.error(`   错误信息: ${e.message}`)
      return false
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log("用法: npx hardhat run scripts/verifyToken.ts --network bsc <tokenAddress> <templateId>")
    console.log("  templateId: 0=无税(MemeToken), 1=有税(MemeTokenTax)")
    process.exit(1)
  }
  
  const tokenAddress = args[0]
  const templateId = parseInt(args[1])
  
  console.log(`开始验证代币合约`)
  console.log(`  地址: ${tokenAddress}`)
  console.log(`  类型: ${templateId === 0 ? "无税(MemeToken)" : "有税(MemeTokenTax)"}`)
  
  // 检查网络是否可用
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)
  
  if (chainId !== 56 && chainId !== 97) {
    console.log(`⚠️  当前网络不是 BSC 主网或测试网，跳过验证`)
    process.exit(0)
  }
  
  // 根据模板 ID 验证不同的合约
  if (templateId === 0) {
    // 无税代币 - MemeToken
    await verifyContract({
      address: tokenAddress,
      constructorArguments: [],
      contract: "contracts/MemeToken.sol:MemeToken"
    })
  } else if (templateId === 1) {
    // 有税代币 - MemeTokenTax
    await verifyContract({
      address: tokenAddress,
      constructorArguments: [],
      contract: "contracts/MemeTokenTax.sol:MemeTokenTax"
    })
  } else {
    console.log(`❌ 不支持的模板 ID: ${templateId}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
