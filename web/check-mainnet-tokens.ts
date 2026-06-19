import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'

const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' // PancakeSwap V2 Factory
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

// 您之前提到的代币地址
const TOKENS = [
  '0x7c1df8f49c1579ce8c03486edfe506a7f9150000', // 杀零猫
  '0x243711d7e281aafd8f5b16914649ff96abd27777', // 战略储备
]

const client = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC)
})

const factoryAbi = [{
  name: 'getPair', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'tokenA', type: 'address' },
    { name: 'tokenB', type: 'address' }
  ], outputs: [{ name: 'pair', type: 'address' }]
}] as const

const erc20Abi = [{
  name: 'decimals', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ name: '', type: 'uint8' }]
}, {
  name: 'symbol', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ name: '', type: 'string' }]
}] as const

async function checkToken(tokenAddress: string) {
  console.log(`\n检查代币: ${tokenAddress}`)
  
  try {
    // 查询代币信息
    const symbol = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'symbol'
    })
    
    const decimals = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    
    console.log(`  Symbol: ${symbol}`)
    console.log(`  Decimals: ${decimals}`)
    
    // 检查与 WBNB 的交易对
    const sorted = [tokenAddress.toLowerCase(), WBNB.toLowerCase()].sort()
    
    const pairAddress = await client.readContract({
      address: FACTORY as `0x${string}`,
      abi: factoryAbi,
      functionName: 'getPair',
      args: [sorted[0] as `0x${string}`, sorted[1] as `0x${string}`]
    })
    
    console.log(`  Pair 地址: ${pairAddress}`)
    
    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      console.log(`  ❌ 交易对不存在！`)
      console.log(`     这个代币在 PancakeSwap 上没有流动性池`)
      console.log(`     需要先添加流动性才能交易`)
      return false
    } else {
      console.log(`  ✅ 交易对存在`)
      
      // 检查流动性
      const pairAbi = [{
        name: 'getReserves', type: 'function', stateMutability: 'view',
        inputs: [], outputs: [
          { name: 'reserve0', type: 'uint112' },
          { name: 'reserve1', type: 'uint112' },
          { name: 'blockTimestampLast', type: 'uint32' }
        ]
      }] as const
      
      const reserves = await client.readContract({
        address: pairAddress as `0x${string}`,
        abi: pairAbi,
        functionName: 'getReserves'
      })
      
      console.log(`  储备量:`)
      console.log(`    Reserve0: ${reserves[0].toString()}`)
      console.log(`    Reserve1: ${reserves[1].toString()}`)
      
      if (reserves[0] === BigInt(0) || reserves[1] === BigInt(0)) {
        console.log(`  ⚠️  流动性不足！`)
        return false
      } else {
        console.log(`  ✅ 有流动性`)
        return true
      }
    }
  } catch (error: any) {
    console.error(`  ❌ 查询失败: ${error.shortMessage || error.message}`)
    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  检查主网代币流动性状态                    ║')
  console.log('╚════════════════════════════════════════════╝\n')
  
  for (const token of TOKENS) {
    await checkToken(token)
  }
  
  console.log('\n═'.repeat(50))
  console.log('💡 结论:')
  console.log('  - 如果显示"交易对不存在"，说明该代币在')
  console.log('    PancakeSwap 上没有流动性池')
  console.log('  - 需要先添加流动性才能进行买卖')
  console.log('  - 或者该代币只在其他 DEX 上有流动性')
  console.log('═'.repeat(50))
}

main().catch(console.error)
