import { createPublicClient, http, parseUnits } from 'viem'
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

async function testRouter() {
  console.log('测试 PancakeSwap Router...\n')
  
  // 测试 BNB -> USDT，输入 0.1 BNB
  const amountIn = parseUnits('0.1', 18)
  
  console.log('输入: 0.1 BNB')
  console.log('amountIn:', amountIn.toString())
  
  try {
    const amountsOut = await client.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [WBNB, USDT]]
    })
    
    console.log('✅ getAmountsOut 成功')
    console.log('输出:', amountsOut)
    console.log('USDT 数量:', amountsOut[1].toString())
  } catch (error) {
    console.error('❌ getAmountsOut 失败:', error)
  }
}

testRouter().catch(console.error)
