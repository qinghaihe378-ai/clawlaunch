import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'

const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const client = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC)
})

// 最近的交易哈希
const TX_HASHES = [
  { hash: '0x04c92454071d7b49e60f32fb7a4a35d18de77ef2b765eda70b8117552c85a125', desc: '杀零猫 - 买入' },
]

async function main() {
  console.log('🔍 检查交易失败原因\n')
  
  for (const txInfo of TX_HASHES) {
    console.log(`交易: ${txInfo.desc}`)
    console.log(`哈希: ${txInfo.hash}`)
    
    try {
      const receipt = await client.getTransactionReceipt({ hash: txInfo.hash as `0x${string}` })
      
      console.log(`状态: ${receipt.status}`)
      console.log(`Gas 使用: ${receipt.gasUsed.toString()}`)
      console.log(`日志数量: ${receipt.logs.length}`)
      
      // 检查是否有 error log
      if (receipt.logs.length > 0) {
        console.log('\n交易日志:')
        receipt.logs.forEach((log, i) => {
          console.log(`  Log #${i + 1}:`)
          console.log(`    Address: ${log.address}`)
          console.log(`    Topics: ${log.topics.length}`)
          if (log.data && log.data !== '0x') {
            console.log(`    Data: ${log.data}`)
          }
        })
      }
      
      console.log('\n' + '-'.repeat(60) + '\n')
    } catch (error: any) {
      console.error('查询失败:', error.message)
      console.log()
    }
  }
}

main().catch(console.error)
