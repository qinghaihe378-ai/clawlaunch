import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.bnbchain.org')
})

async function checkUSDT() {
  // BSC 上的 USDT 实际地址
  const usdtAddress = '0x55d398326f99059fF775485246999027B3197955'
  
  console.log('检查 BSC USDT 合约...')
  console.log('地址:', usdtAddress)
  
  // 直接调用 decimals
  try {
    const decimals = await client.readContract({
      address: usdtAddress as `0x${string}`,
      abi: [{
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }]
      }],
      functionName: 'decimals'
    })
    
    console.log('decimals() 返回值:', decimals)
    console.log('类型:', typeof decimals)
  } catch (error) {
    console.error('查询失败:', error)
  }
}

checkUSDT().catch(console.error)
