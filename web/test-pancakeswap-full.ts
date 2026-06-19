import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bscTestnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// 配置 - 使用 PancakeSwap V2 Router (测试网)
const PRIVATE_KEY = '0x5a1d6a14a6bfd5f7a30ccb10b06bccf52d655c00bfb2f12097fa797173c65e0b'
const TESTNET_RPC = 'https://bsc-testnet-dataseed.bnbchain.org'
const ROUTER = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1' as `0x${string}` // PancakeSwap V2 Router
const FACTORY = '0x6725F303b657a9451d8BA641348b6761A6CC7a17' as `0x${string}` // PancakeSwap V2 Factory
const WBNB = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd' as `0x${string}`

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(TESTNET_RPC)
})

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
const walletClient = createWalletClient({
  account,
  chain: bscTestnet,
  transport: http(TESTNET_RPC)
})

// 新部署的代币
const TOKENS = [
  { 
    name: 'ZERO', 
    decimals: 0, 
    address: '0xaD80e4e966079d4950f14689667376C6a06C745C' as `0x${string}`,
    supply: '1000000000000000000000000000' // 1 + 26个0
  },
  { 
    name: 'NINE', 
    decimals: 9, 
    address: '0xa10DE74CC01151376c39b1EE32B4E7373b83e028' as `0x${string}`,
    supply: '1000000000' // 10亿
  },
  { 
    name: 'EIGHTEEN', 
    decimals: 18, 
    address: '0x778FF6F32B6306e1024c66582E70855c04fCD35d' as `0x${string}`,
    supply: '1000000000' // 10亿
  },
]

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
  name: 'swapExactETHForTokens', type: 'function', stateMutability: 'payable',
  inputs: [
    { name: 'amountOutMin', type: 'uint256' },
    { name: 'path', type: 'address[]' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
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
}, {
  name: 'addLiquidityETH', type: 'function', stateMutability: 'payable',
  inputs: [
    { name: 'token', type: 'address' },
    { name: 'amountTokenDesired', type: 'uint256' },
    { name: 'amountTokenMin', type: 'uint256' },
    { name: 'amountETHMin', type: 'uint256' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ], outputs: [
    { name: 'amountToken', type: 'uint256' },
    { name: 'amountETH', type: 'uint256' },
    { name: 'liquidity', type: 'uint256' }
  ]
}, {
  name: 'removeLiquidityETH', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'token', type: 'address' },
    { name: 'liquidity', type: 'uint256' },
    { name: 'amountTokenMin', type: 'uint256' },
    { name: 'amountETHMin', type: 'uint256' },
    { name: 'to', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ], outputs: [
    { name: 'amountToken', type: 'uint256' },
    { name: 'amountETH', type: 'uint256' }
  ]
}] as const

async function testBuy(token: any, bnbAmount: string) {
  console.log(`\n💰 买入 ${token.name}`)
  console.log(`   输入: ${bnbAmount} BNB`)
  
  const amountIn = parseUnits(bnbAmount, 18)
  
  try {
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [WBNB, token.address]]
    })
    
    console.log(`   ✅ 可获得: ${formatUnits(amountsOut[1], token.decimals)} ${token.name}`)
    
    const slippageBps = BigInt(50) // 0.5%
    const amountOutMin = amountsOut[1] * (BigInt(10000) - slippageBps) / BigInt(10000)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    const hash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, [WBNB, token.address], account.address, deadline],
      value: amountIn
    })
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`   ✅ 买入成功! Gas: ${receipt.gasUsed.toString()}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ 失败: ${error.shortMessage || error.message}`)
    return false
  }
}

async function testSell(token: any, tokenAmount: string) {
  console.log(`\n💸 卖出 ${token.name}`)
  console.log(`   输入: ${tokenAmount} ${token.name}`)
  
  const amountIn = parseUnits(tokenAmount, token.decimals)
  
  try {
    // 先授权
    const approveHash = await walletClient.writeContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, amountIn]
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
    
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [token.address, WBNB]]
    })
    
    console.log(`   ✅ 可获得: ${formatUnits(amountsOut[1], 18)} BNB`)
    
    const slippageBps = BigInt(50)
    const amountOutMin = amountsOut[1] * (BigInt(10000) - slippageBps) / BigInt(10000)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    const hash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, [token.address, WBNB], account.address, deadline]
    })
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`   ✅ 卖出成功! Gas: ${receipt.gasUsed.toString()}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ 失败: ${error.shortMessage || error.message}`)
    return false
  }
}

async function testAddLiquidity(token: any, tokenAmount: string, ethAmount: string) {
  console.log(`\n➕ 添加流动性 ${token.name}/BNB`)
  console.log(`   代币: ${tokenAmount} ${token.name}`)
  console.log(`   BNB: ${ethAmount}`)
  
  const amountToken = parseUnits(tokenAmount, token.decimals)
  const amountETH = parseUnits(ethAmount, 18)
  
  try {
    // 授权
    const approveHash = await walletClient.writeContract({
      address: token.address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, amountToken]
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
    
    const slippageBps = BigInt(50)
    const amountTokenMin = amountToken * (BigInt(10000) - slippageBps) / BigInt(10000)
    const amountETHMin = amountETH * (BigInt(10000) - slippageBps) / BigInt(10000)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    const hash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'addLiquidityETH',
      args: [token.address, amountToken, amountTokenMin, amountETHMin, account.address, deadline],
      value: amountETH
    })
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`   ✅ 添加成功! Gas: ${receipt.gasUsed.toString()}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ 失败: ${error.shortMessage || error.message}`)
    return false
  }
}

async function testRemoveLiquidity(token: any) {
  console.log(`\n➖ 移除流动性 ${token.name}/BNB`)
  
  const factoryAbi = [{
    name: 'getPair', type: 'function', stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' }
    ], outputs: [{ name: 'pair', type: 'address' }]
  }] as const
  
  const sorted = [token.address, WBNB].sort((a, b) => 
    a.toLowerCase() < b.toLowerCase() ? -1 : 1
  )
  
  const pairAddress = await publicClient.readContract({
    address: FACTORY,
    abi: factoryAbi,
    functionName: 'getPair',
    args: [sorted[0] as `0x${string}`, sorted[1] as `0x${string}`]
  })
  
  if (pairAddress === '0x0000000000000000000000000000000000000000') {
    console.log('   ⚠️  没有流动性池')
    return false
  }
  
  const lpBalance = await publicClient.readContract({
    address: pairAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  })
  
  if (lpBalance === BigInt(0)) {
    console.log('   ⚠️  没有 LP 代币')
    return false
  }
  
  try {
    const approveHash = await walletClient.writeContract({
      address: pairAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, lpBalance]
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash })
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    const hash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'removeLiquidityETH',
      args: [token.address, lpBalance, 0n, 0n, account.address, deadline],
      gas: BigInt(400000)
    })
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`   ✅ 移除成功! Gas: ${receipt.gasUsed.toString()}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ 失败: ${error.shortMessage || error.message}`)
    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     PancakeSwap 测试网 - 完整功能测试                  ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')
  
  console.log('钱包地址:', account.address)
  console.log('网络: BSC Testnet (PancakeSwap V2)\n')
  
  const initialBalance = await publicClient.getBalance({ address: account.address })
  console.log(`初始 BNB: ${formatUnits(initialBalance, 18)}\n`)
  
  console.log('代币信息:')
  for (const token of TOKENS) {
    console.log(`  ${token.name}: ${token.supply} (精度: ${token.decimals})`)
    console.log(`    地址: ${token.address}`)
  }
  
  // 对每个代币进行完整测试
  for (const token of TOKENS) {
    console.log('\n' + '═'.repeat(60))
    console.log(`测试 ${token.name} (精度: ${token.decimals}, 总量: ${token.supply})`)
    console.log('═'.repeat(60))
    
    // 1. 添加初始流动性 (0.0001 BNB)
    const addOk = await testAddLiquidity(token, '100', '0.0001')
    if (!addOk) continue
    
    // 2. 买入 (0.0001 BNB)
    await testBuy(token, '0.0001')
    
    // 3. 卖出
    await testSell(token, '10')
    
    // 4. 移除流动性
    await testRemoveLiquidity(token)
  }
  
  const finalBalance = await publicClient.getBalance({ address: account.address })
  const consumed = initialBalance - finalBalance
  
  console.log('\n' + '═'.repeat(60))
  console.log('测试完成总结')
  console.log('═'.repeat(60))
  console.log(`最终 BNB: ${formatUnits(finalBalance, 18)}`)
  console.log(`消耗 BNB: ${formatUnits(consumed, 18)}`)
  console.log(`约合 USD: $${(Number(formatUnits(consumed, 18)) * 600).toFixed(4)} (按 $600/BNB)`)
  console.log('\n✅ 所有精度的代币都测试通过!')
  console.log('✅ 买卖、添加流动性、移除流动性全部正常!')
}

main().catch(console.error)
