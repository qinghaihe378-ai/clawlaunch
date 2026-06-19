import { createPublicClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'

const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`

const TOKENS = [
  { address: '0x243711d7e281aafd8f5b16914649ff96abd27777' as `0x${string}`, name: '战略储备' },
  { address: '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`, name: '杀零猫' },
]

const client = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC)
})

const routerAbi = [{
  name: 'getAmountsOut', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ], outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

const erc20Abi = [{
  name: 'decimals', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ name: '', type: 'uint8' }]
}, {
  name: 'symbol', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ name: '', type: 'string' }]
}] as const

async function main() {
  console.log('🔍 检查代币报价和滑点\n')
  
  for (const token of TOKENS) {
    console.log(`代币: ${token.name}`)
    console.log(`地址: ${token.address}\n`)
    
    const decimals = await client.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    const symbol = await client.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'symbol'
    })
    
    // 测试买入报价 (0.0001 BNB)
    const buyAmount = parseUnits('0.0001', 18)
    try {
      const buyAmountsOut = await client.readContract({
        address: ROUTER,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: [buyAmount, [WBNB, token.address]]
      })
      console.log(`买入报价 (0.0001 BNB → ${symbol}):`)
      console.log(`  预期获得: ${formatUnits(buyAmountsOut[1], Number(decimals))}`)
      
      // 计算不同滑点下的最小获得量
      const amountOutMin_0_5 = buyAmountsOut[1] * BigInt(9950) / BigInt(10000) // 0.5%
      const amountOutMin_1 = buyAmountsOut[1] * BigInt(9900) / BigInt(10000)   // 1%
      const amountOutMin_5 = buyAmountsOut[1] * BigInt(9500) / BigInt(10000)   // 5%
      const amountOutMin_10 = buyAmountsOut[1] * BigInt(9000) / BigInt(10000)  // 10%
      
      console.log(`  0.5% 滑点: ${formatUnits(amountOutMin_0_5, Number(decimals))} (当前使用)`)
      console.log(`  1% 滑点: ${formatUnits(amountOutMin_1, Number(decimals))}`)
      console.log(`  5% 滑点: ${formatUnits(amountOutMin_5, Number(decimals))}`)
      console.log(`  10% 滑点: ${formatUnits(amountOutMin_10, Number(decimals))}`)
    } catch (error: any) {
      console.log(`  ❌ 获取买入报价失败: ${error.shortMessage || error.message}`)
    }
    
    console.log()
    
    // 测试卖出报价 (假设有 100 代币)
    const sellAmount = parseUnits('100', Number(decimals))
    try {
      const sellAmountsOut = await client.readContract({
        address: ROUTER,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: [sellAmount, [token.address, WBNB]]
      })
      console.log(`卖出报价 (100 ${symbol} → BNB):`)
      console.log(`  预期获得: ${formatUnits(sellAmountsOut[1], 18)} BNB`)
      
      const sellAmountOutMin_0_5 = sellAmountsOut[1] * BigInt(9950) / BigInt(10000)
      const sellAmountOutMin_1 = sellAmountsOut[1] * BigInt(9900) / BigInt(10000)
      const sellAmountOutMin_5 = sellAmountsOut[1] * BigInt(9500) / BigInt(10000)
      const sellAmountOutMin_10 = sellAmountsOut[1] * BigInt(9000) / BigInt(10000)
      
      console.log(`  0.5% 滑点: ${formatUnits(sellAmountOutMin_0_5, 18)} BNB (当前使用)`)
      console.log(`  1% 滑点: ${formatUnits(sellAmountOutMin_1, 18)} BNB`)
      console.log(`  5% 滑点: ${formatUnits(sellAmountOutMin_5, 18)} BNB`)
      console.log(`  10% 滑点: ${formatUnits(sellAmountOutMin_10, 18)} BNB`)
    } catch (error: any) {
      console.log(`  ❌ 获取卖出报价失败: ${error.shortMessage || error.message}`)
    }
    
    console.log('\n' + '='.repeat(60) + '\n')
  }
}

main().catch(console.error)
