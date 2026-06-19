import { createPublicClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.bnbchain.org')
})

const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
const USDT = '0x55d398326f99059fF775485246999027B3197955'

const routerAbi = [{
  name: 'getAmountsOut',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ],
  outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

const erc20Abi = [{
  name: 'decimals',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint8' }]
}, {
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }]
}] as const

async function testCustomToken() {
  console.log('=== 测试自定义代币交易 ===\n')
  
  // 找一个真实的自定义代币地址（最近创建的）
  // 这里用一个示例地址，您需要替换成实际的自定义代币地址
  const customToken = '0xYOUR_CUSTOM_TOKEN_ADDRESS_HERE' as `0x${string}`
  
  console.log('测试代币:', customToken)
  
  try {
    // 1. 查询精度
    const decimals = await client.readContract({
      address: customToken,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    console.log('✅ 精度:', decimals)
    
    // 2. 尝试查询报价 (customToken -> WBNB)
    const amountIn = parseUnits('1', Number(decimals))
    console.log('输入金额: 1 token')
    console.log('amountIn:', amountIn.toString())
    
    const amountsOut = await client.readContract({
      address: ROUTER as `0x${string}`,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [customToken, WBNB]]
    })
    
    console.log('✅ 报价查询成功!')
    console.log('输出:', formatUnits(amountsOut[1], 18), 'BNB')
    
  } catch (error: any) {
    console.error('❌ 错误:', error.shortMessage || error.message)
    console.error('详细:', error.details || error.metaMessages?.join('\n'))
  }
}

async function testZeroDecimalToken() {
  console.log('\n=== 测试 0 精度代币 ===\n')
  
  // 找一个 0 精度的代币
  // 注意：真正的 0 精度代币很少见，大多数 meme 币使用 9 或 18 位精度
  const zeroDecimalToken = '0xYOUR_ZERO_DECIMAL_TOKEN' as `0x${string}`
  
  console.log('测试代币:', zeroDecimalToken)
  
  try {
    const decimals = await client.readContract({
      address: zeroDecimalToken,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    console.log('精度:', decimals)
    
    if (Number(decimals) === 0) {
      console.log('✅ 确实是 0 精度代币')
      
      // 测试报价
      const amountIn = parseUnits('100', 0) // 100 个代币
      console.log('输入: 100 tokens')
      console.log('amountIn:', amountIn.toString())
      
      const amountsOut = await client.readContract({
        address: ROUTER as `0x${string}`,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: [amountIn, [zeroDecimalToken, WBNB]]
      })
      
      console.log('✅ 报价:', formatUnits(amountsOut[1], 18), 'BNB')
    } else {
      console.log('⚠️  这不是 0 精度代币，实际精度:', decimals)
    }
  } catch (error: any) {
    console.error('❌ 错误:', error.shortMessage || error.message)
  }
}

async function main() {
  console.log('BSC 主网连接测试...')
  
  const blockNumber = await client.getBlockNumber()
  console.log('当前区块:', blockNumber.toString())
  console.log('RPC 正常\n')
  
  // 运行测试
  await testCustomToken()
  await testZeroDecimalToken()
}

main().catch(console.error)
