import { createPublicClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'

// BSC 主网 RPC
const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.bnbchain.org')
})

// ERC20 ABI
const erc20Abi = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

async function testTokenDecimals() {
  console.log('=== 测试代币精度查询 ===\n')
  
  // 测试几个已知代币
  const tokens = [
    { name: 'USDT (6位精度)', address: '0x55d398326f99059fF775485246999027B3197955' },
    { name: 'CAKE (18位精度)', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82' },
  ]
  
  for (const token of tokens) {
    try {
      console.log(`测试 ${token.name}:`)
      console.log(`地址: ${token.address}`)
      
      // 查询 decimals
      const decimals = await client.readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals'
      })
      
      console.log(`✅ 精度: ${decimals}`)
      
      // 测试 parseUnits
      const amount = '10'
      const parsed = parseUnits(amount, Number(decimals))
      console.log(`用户输入: ${amount}`)
      console.log(`转换后: ${parsed.toString()}`)
      console.log(`格式化回: ${formatUnits(parsed, Number(decimals))}`)
      console.log('---\n')
    } catch (error) {
      console.error(`❌ 失败:`, error)
      console.log('---\n')
    }
  }
}

testTokenDecimals().catch(console.error)
