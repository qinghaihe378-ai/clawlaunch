import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// 配置 - 主网
const PRIVATE_KEY = process.argv[2] // 从命令行参数获取私钥
const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`

// 测试代币 - 杀零猫 (0精度)
const TOKEN_ADDRESS = '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`

if (!PRIVATE_KEY) {
  console.error('❌ 请提供私钥作为参数')
  console.error('用法: npx tsx test-mainnet-sell.ts <PRIVATE_KEY>')
  process.exit(1)
}

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC)
})

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
console.log('钱包地址:', account.address)

const walletClient = createWalletClient({
  account,
  chain: bsc,
  transport: http(MAINNET_RPC)
})

const erc20Abi = [{
  name: 'decimals', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ name: '', type: 'uint8' }]
}, {
  name: 'symbol', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ name: '', type: 'string' }]
}, {
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }]
}, {
  name: 'approve', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ], outputs: [{ name: '', type: 'bool' }]
}] as const

const routerAbi = [{
  name: 'getAmountsOut', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ], outputs: [{ name: 'amounts', type: 'uint256[]' }]
}, {
  name: 'swapExactTokensForETH', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'path', type: 'address[]' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ], outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

async function main() {
  console.log('\n=== 检查钱包状态 ===\n')
  
  // 检查 BNB 余额
  const bnbBalance = await publicClient.getBalance({ address: account.address })
  console.log('BNB 余额:', formatUnits(bnbBalance, 18))
  
  if (bnbBalance < parseUnits('0.0001', 18)) {
    console.log('⚠️  BNB 余额不足，需要至少 0.0001 BNB')
    return
  }
  
  // 检查代币信息
  console.log('\n=== 检查代币信息 ===\n')
  
  const symbol = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol'
  })
  
  const decimals = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals'
  })
  
  const tokenBalance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  })
  
  console.log('代币 Symbol:', symbol)
  console.log('代币 Decimals:', decimals)
  console.log('代币余额:', formatUnits(tokenBalance, Number(decimals)))
  
  if (tokenBalance === BigInt(0)) {
    console.log('\n⚠️  没有代币余额，无法测试卖出')
    console.log('请先买入一些代币')
    return
  }
  
  // 测试卖出
  console.log('\n=== 测试卖出 ===\n')
  
  const sellAmount = '1' // 卖出 1 个代币
  const amountIn = parseUnits(sellAmount, Number(decimals))
  
  console.log('卖出数量:', sellAmount, symbol)
  console.log('amountIn:', amountIn.toString())
  
  try {
    // 获取报价
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [TOKEN_ADDRESS, WBNB]]
    })
    
    console.log('✅ 报价查询成功')
    console.log('可获得 BNB:', formatUnits(amountsOut[1], 18))
    
    // 先授权
    console.log('\n授权 Router...')
    const maxApproval = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935")
    
    const approveHash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, maxApproval]
    })
    
    console.log('授权交易哈希:', approveHash)
    console.log('等待授权确认...')
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
    console.log('✅ 授权成功')
    
    // 计算滑点
    const slippageBps = BigInt(50) // 0.5%
    const amountOutMin = amountsOut[1] * (BigInt(10000) - slippageBps) / BigInt(10000)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    console.log('\n发起卖出交易...')
    console.log('amountOutMin:', amountOutMin.toString())
    
    const swapHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, [TOKEN_ADDRESS, WBNB], account.address, deadline]
    })
    
    console.log('卖出交易哈希:', swapHash)
    console.log('等待确认...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash })
    
    console.log('\n✅ 卖出成功!')
    console.log('Gas 使用:', receipt.gasUsed.toString())
    console.log('交易状态:', receipt.status)
    
  } catch (error: any) {
    console.error('\n❌ 卖出失败:', error.shortMessage || error.message)
    console.error('详细错误:', error.details || error.metaMessages?.join('\n'))
  }
}

main().catch(console.error)
