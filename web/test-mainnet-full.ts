import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// 配置 - 主网
const PRIVATE_KEY = '0x0fcd3c6f3e21ada0bfb772cae7a6735234b5aafb0c4e4df1cf04bf725a50c8d9'
const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`

// 杀零猫代币 (0精度)
const TOKEN_ADDRESS = '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC, {
    retryCount: 3,
    retryDelay: 1000
  })
})

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
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
  inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
}, {
  name: 'allowance', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' }
  ], outputs: [{ name: '', type: 'uint256' }]
}, {
  name: 'approve', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ], outputs: [{ name: '', type: 'bool' }]
}] as const

const routerAbi = [{
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
  name: 'getAmountsOut', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ], outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  主网完整测试 - 0精度代币买卖流程          ║')
  console.log('╚════════════════════════════════════════════╝\n')
  
  // 1. 检查余额
  console.log('📊 步骤 1: 检查初始状态')
  const bnbBalance = await publicClient.getBalance({ address: account.address })
  console.log(`   钱包地址: ${account.address}`)
  console.log(`   BNB 余额: ${formatUnits(bnbBalance, 18)} BNB`)
  
  const tokenSymbol = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol'
  })
  const tokenDecimals = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals'
  })
  console.log(`   代币: ${tokenSymbol} (${tokenDecimals} 精度)`)
  
  const tokenBalance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address]
  })
  console.log(`   ${tokenSymbol} 余额: ${formatUnits(tokenBalance, Number(tokenDecimals))}\n`)
  
  // 2. 买入代币 (0.00001 BNB)
  console.log('💰 步骤 2: 买入代币 (0.00001 BNB)')
  const buyAmount = parseUnits('0.00001', 18)
  let balanceAfterBuy = tokenBalance
  let buyReceipt: any = null
  let approveReceipt: any = null
  
  try {
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [buyAmount, [WBNB, TOKEN_ADDRESS]]
    })
    console.log(`   预期获得: ${formatUnits(amountsOut[1], Number(tokenDecimals))} ${tokenSymbol}`)
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const amountOutMin = amountsOut[1] * BigInt(9950) / BigInt(10000) // 0.5% slippage
    
    console.log('   发送交易...')
    const buyHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, [WBNB, TOKEN_ADDRESS], account.address, deadline],
      value: buyAmount,
      gas: BigInt(300000)
    })
    
    console.log(`   交易哈希: ${buyHash}`)
    console.log('   等待确认...')
    
    buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash })
    console.log(`   ✅ 买入成功! Gas: ${buyReceipt.gasUsed}\n`)
    
    // 检查买入后的余额
    balanceAfterBuy = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    })
    console.log(`   ${tokenSymbol} 余额: ${formatUnits(balanceAfterBuy, Number(tokenDecimals))}\n`)
    
  } catch (error: any) {
    console.error('   ❌ 买入失败:', error.shortMessage || error.message)
    console.error('   详细信息:', error.details || error)
    return
  }
  
  // 3. 授权 Router
  console.log('🔐 步骤 3: 授权 Router')
  try {
    const currentAllowance = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, ROUTER]
    })
    console.log(`   当前授权: ${formatUnits(currentAllowance, Number(tokenDecimals))}`)
    
    if (currentAllowance < balanceAfterBuy) {
      const maxApproval = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')
      
      console.log('   发送授权交易...')
      const approveHash = await walletClient.writeContract({
        address: TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [ROUTER, maxApproval],
        gas: BigInt(100000)
      })
      
      console.log(`   交易哈希: ${approveHash}`)
      console.log('   等待确认...')
      
      approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash })
      console.log(`   ✅ 授权成功! Gas: ${approveReceipt.gasUsed}\n`)
    } else {
      console.log('   ✅ 已有足够授权\n')
    }
    
  } catch (error: any) {
    console.error('   ❌ 授权失败:', error.shortMessage || error.message)
    console.error('   详细信息:', error.details || error)
    return
  }
  
  // 4. 卖出代币 (卖出一半)
  console.log('💸 步骤 4: 卖出代币')
  const sellAmount = balanceAfterBuy / BigInt(2)
  console.log(`   卖出数量: ${formatUnits(sellAmount, Number(tokenDecimals))} ${tokenSymbol}`)
  
  try {
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [sellAmount, [TOKEN_ADDRESS, WBNB]]
    })
    console.log(`   预期获得: ${formatUnits(amountsOut[1], 18)} BNB`)
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const amountOutMin = amountsOut[1] * BigInt(9950) / BigInt(10000) // 0.5% slippage
    
    console.log('   发送交易...')
    const sellHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactTokensForETH',
      args: [sellAmount, amountOutMin, [TOKEN_ADDRESS, WBNB], account.address, deadline],
      gas: BigInt(300000)
    })
    
    console.log(`   交易哈希: ${sellHash}`)
    console.log('   等待确认...')
    
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash })
    console.log(`   ✅ 卖出成功! Gas: ${sellReceipt.gasUsed}\n`)
    
    // 检查最终余额
    const finalTokenBalance = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    })
    const finalBnbBalance = await publicClient.getBalance({ address: account.address })
    
    console.log('📊 最终状态:')
    console.log(`   ${tokenSymbol} 余额: ${formatUnits(finalTokenBalance, Number(tokenDecimals))}`)
    console.log(`   BNB 余额: ${formatUnits(finalBnbBalance, 18)} BNB`)
    
    const totalGas = buyReceipt.gasUsed + approveReceipt.gasUsed + sellReceipt.gasUsed
    console.log(`   总 Gas 消耗: ${totalGas}`)
    
    console.log('\n✅ 所有测试通过! 0精度代币可以正常买卖!')
    
  } catch (error: any) {
    console.error('   ❌ 卖出失败:', error.shortMessage || error.message)
    console.error('   错误代码:', error.code)
    console.error('   详细信息:', error.details || error)
    console.error('\n   💡 这是我们需要修复的问题!')
  }
}

main().catch(console.error)
