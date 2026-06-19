import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// 配置
const PRIVATE_KEY = '0x0dd91b915f3cdde52fde7b6bfd2f6aef3e7e866297512d73827bc264ae9c0a55'
const CUSTOM_TOKEN = '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' as `0x${string}`

// 创建客户端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.bnbchain.org')
})

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
console.log('钱包地址:', account.address)

const walletClient = createWalletClient({
  account,
  chain: bsc,
  transport: http('https://bsc-dataseed.bnbchain.org')
})

// ABI
const erc20Abi = [{
  name: 'decimals',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint8' }]
}, {
  name: 'symbol',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'string' }]
}, {
  name: 'name',
  type: 'function',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'string' }]
}, {
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }]
}, {
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ name: '', type: 'bool' }]
}] as const

const routerAbi = [{
  name: 'getAmountsOut',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ],
  outputs: [{ name: 'amounts', type: 'uint256[]' }]
}, {
  name: 'swapExactTokensForETH',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'path', type: 'address[]' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ],
  outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

const factoryAbi = [{
  name: 'getPair',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    { name: 'tokenA', type: 'address' },
    { name: 'tokenB', type: 'address' }
  ],
  outputs: [{ name: 'pair', type: 'address' }]
}] as const

async function testTokenInfo() {
  console.log('\n=== 1. 测试代币基本信息 ===\n')
  
  try {
    const symbol = await publicClient.readContract({
      address: CUSTOM_TOKEN,
      abi: erc20Abi,
      functionName: 'symbol'
    })
    console.log('✅ Symbol:', symbol)
    
    const name = await publicClient.readContract({
      address: CUSTOM_TOKEN,
      abi: erc20Abi,
      functionName: 'name'
    })
    console.log('✅ Name:', name)
    
    const decimals = await publicClient.readContract({
      address: CUSTOM_TOKEN,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    console.log('✅ Decimals:', decimals)
    
    return { symbol, name, decimals: Number(decimals) }
  } catch (error: any) {
    console.error('❌ 查询代币信息失败:', error.shortMessage || error.message)
    throw error
  }
}

async function testBalance(tokenInfo: any) {
  console.log('\n=== 2. 测试余额查询 ===\n')
  
  try {
    const balance = await publicClient.readContract({
      address: CUSTOM_TOKEN,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    })
    
    const formatted = formatUnits(balance, tokenInfo.decimals)
    console.log('✅ 余额:', formatted, tokenInfo.symbol)
    console.log('   原始值:', balance.toString())
    
    return balance
  } catch (error: any) {
    console.error('❌ 查询余额失败:', error.shortMessage || error.message)
    throw error
  }
}

async function testPairAddress() {
  console.log('\n=== 3. 测试交易对地址查询 ===\n')
  
  // 排序地址
  const sorted = [CUSTOM_TOKEN, WBNB].sort((a, b) => 
    a.toLowerCase() < b.toLowerCase() ? -1 : 1
  )
  console.log('排序后的地址:', sorted)
  
  try {
    const pairAddress = await publicClient.readContract({
      address: FACTORY,
      abi: factoryAbi,
      functionName: 'getPair',
      args: [sorted[0] as `0x${string}`, sorted[1] as `0x${string}`]
    })
    
    console.log('✅ Pair 地址:', pairAddress)
    
    if (pairAddress === '0x0000000000000000000000000000000000000000') {
      console.error('⚠️  交易对不存在！请确保该代币在 PancakeSwap 上有流动性池')
      return null
    }
    
    return pairAddress
  } catch (error: any) {
    console.error('❌ 查询 Pair 地址失败:', error.shortMessage || error.message)
    throw error
  }
}

async function testQuote(tokenInfo: any, amount: string) {
  console.log('\n=== 4. 测试报价查询 ===\n')
  
  const amountIn = parseUnits(amount, tokenInfo.decimals)
  console.log('输入金额:', amount, tokenInfo.symbol)
  console.log('amountIn:', amountIn.toString())
  
  try {
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [CUSTOM_TOKEN, WBNB]]
    })
    
    console.log('✅ 报价查询成功!')
    console.log('输出 BNB:', formatUnits(amountsOut[1], 18))
    console.log('原始值:', amountsOut[1].toString())
    
    return amountsOut
  } catch (error: any) {
    console.error('❌ 报价查询失败:', error.shortMessage || error.message)
    console.error('详细错误:', error.details || error.metaMessages?.join('\n'))
    throw error
  }
}

async function testApprove(tokenInfo: any) {
  console.log('\n=== 5. 测试授权交易 ===\n')
  
  const approveAmount = parseUnits('1000000', tokenInfo.decimals)
  console.log('授权金额: 1000000', tokenInfo.symbol)
  console.log('授权数量:', approveAmount.toString())
  
  try {
    const hash = await walletClient.writeContract({
      address: CUSTOM_TOKEN,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, approveAmount]
    })
    
    console.log('✅ 授权交易已发送!')
    console.log('交易哈希:', hash)
    
    // 等待确认
    console.log('等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ 授权交易确认!')
    console.log('Gas 使用:', receipt.gasUsed.toString())
    console.log('状态:', receipt.status)
    
    return true
  } catch (error: any) {
    console.error('❌ 授权交易失败:', error.shortMessage || error.message)
    console.error('详细错误:', error.details || error.metaMessages?.join('\n'))
    throw error
  }
}

async function testSwap(tokenInfo: any, amount: string) {
  console.log('\n=== 6. 测试 Swap 交易 ===\n')
  
  const amountIn = parseUnits(amount, tokenInfo.decimals)
  console.log('卖出金额:', amount, tokenInfo.symbol)
  console.log('amountIn:', amountIn.toString())
  
  // 先获取报价
  const amountsOut = await publicClient.readContract({
    address: ROUTER,
    abi: routerAbi,
    functionName: 'getAmountsOut',
    args: [amountIn, [CUSTOM_TOKEN, WBNB]]
  })
  
  const amountOutMin = amountsOut[1] * BigInt(95) / BigInt(100) // 5% slippage
  console.log('最少获得 BNB:', formatUnits(amountOutMin, 18))
  
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
  console.log('Deadline:', deadline.toString())
  
  try {
    const hash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, [CUSTOM_TOKEN, WBNB], account.address, deadline]
    })
    
    console.log('✅ Swap 交易已发送!')
    console.log('交易哈希:', hash)
    
    // 等待确认
    console.log('等待交易确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ Swap 交易确认!')
    console.log('Gas 使用:', receipt.gasUsed.toString())
    console.log('状态:', receipt.status)
    
    return true
  } catch (error: any) {
    console.error('❌ Swap 交易失败:', error.shortMessage || error.message)
    console.error('详细错误:', error.details || error.metaMessages?.join('\n'))
    throw error
  }
}

async function main() {
  console.log('========================================')
  console.log('开始测试自定义代币交易')
  console.log('========================================')
  console.log('网络: BSC Mainnet')
  console.log('钱包:', account.address)
  console.log('代币:', CUSTOM_TOKEN)
  console.log('========================================')
  
  try {
    // 1. 查询代币信息
    const tokenInfo = await testTokenInfo()
    
    // 2. 查询余额
    const balance = await testBalance(tokenInfo)
    
    if (balance === BigInt(0)) {
      console.log('\n⚠️  余额为 0，无法继续测试交易')
      console.log('请先向该钱包转入一些', tokenInfo.symbol, '代币')
      return
    }
    
    // 3. 查询交易对
    const pairAddress = await testPairAddress()
    if (!pairAddress) {
      console.log('\n⚠️  交易对不存在，无法交易')
      return
    }
    
    // 4. 测试报价
    const testAmount = '1' // 测试 1 个代币
    await testQuote(tokenInfo, testAmount)
    
    // 5. 测试授权（可选，取消注释以实际执行）
    // await testApprove(tokenInfo)
    
    // 6. 测试 Swap（可选，取消注释以实际执行）
    // await testSwap(tokenInfo, testAmount)
    
    console.log('\n========================================')
    console.log('✅ 所有测试通过!')
    console.log('========================================')
    console.log('\n代币信息总结:')
    console.log('- Symbol:', tokenInfo.symbol)
    console.log('- Name:', tokenInfo.name)
    console.log('- Decimals:', tokenInfo.decimals)
    console.log('- Balance:', formatUnits(balance, tokenInfo.decimals))
    console.log('- Pair Address:', pairAddress)
    console.log('\n该代币可以正常交易!')
    
  } catch (error) {
    console.error('\n========================================')
    console.error('❌ 测试失败')
    console.error('========================================')
    console.error(error)
  }
}

main().catch(console.error)
