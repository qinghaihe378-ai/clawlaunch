import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'

const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const BUY_TX = '0x04c92454071d7b49e60f32fb7a4a35d18de77ef2b765eda70b8117552c85a125'

const client = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC)
})

async function main() {
  console.log('🔍 检查交易详情\n')
  
  const tx = await client.getTransaction({ hash: BUY_TX })
  console.log('交易哈希:', tx.hash)
  console.log('From:', tx.from)
  console.log('To:', tx.to)
  console.log('Value:', tx.value.toString())
  console.log('Gas Limit:', tx.gas.toString())
  console.log()
  
  const receipt = await client.getTransactionReceipt({ hash: BUY_TX })
  console.log('交易状态:', receipt.status)
  console.log('Status 类型:', typeof receipt.status)
  console.log('Status 值:', receipt.status === 'success' ? '成功' : receipt.status === 'reverted' ? '失败' : receipt.status)
  console.log('Gas Used:', receipt.gasUsed.toString())
  console.log()
  
  if (receipt.status === 'reverted') {
    console.log('❌ 交易失败！')
    console.log('\n可能原因:')
    console.log('1. Gas 估算不准确')
    console.log('2. 滑点设置过低')
    console.log('3. 流动性不足')
    console.log('4. 代币合约有特殊限制')
    
    // 尝试获取 revert reason
    if (receipt.logs.length > 0) {
      console.log('\n交易日志数量:', receipt.logs.length)
    }
  } else {
    console.log('✅ 交易成功')
  }
}

main().catch(console.error)
