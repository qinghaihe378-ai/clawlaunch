import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const PRIVATE_KEY = '0x0fcd3c6f3e21ada0bfb772cae7a6735234b5aafb0c4e4df1cf04bf725a50c8d9'
const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`
const TOKEN_ADDRESS = '0x243711d7e281aafd8f5b16914649ff96abd27777' as `0x${string}` // 战略储备

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(MAINNET_RPC)
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

async function testWithSlippage(slippagePercent: number) {
  console.log(`\n🧪 测试滑点: ${slippagePercent}%`)
  console.log('-'.repeat(60))
  
  try {
    // 买入测试
    const buyAmount = parseUnits('0.0001', 18)
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [buyAmount, [WBNB, TOKEN_ADDRESS]]
    })
    
    const decimals = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    const symbol = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'symbol'
    })
    
    const slippageBps = BigInt(Math.floor(slippagePercent * 100))
    const amountOutMin = amountsOut[1] * (BigInt(10000) - slippageBps) / BigInt(10000)
    
    console.log(`预期获得: ${formatUnits(amountsOut[1], Number(decimals))} ${symbol}`)
    console.log(`最小获得 (${slippagePercent}%): ${formatUnits(amountOutMin, Number(decimals))}`)
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    const buyHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, [WBNB, TOKEN_ADDRESS], account.address, deadline],
      value: buyAmount,
      gas: BigInt(300000)
    })
    
    const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash })
    
    if (buyReceipt.status === 'reverted') {
      console.log('❌ 买入失败\n')
      return false
    }
    
    console.log('✅ 买入成功')
    console.log(`Gas: ${buyReceipt.gasUsed}\n`)
    
    const balance = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    })
    
    // 卖出测试
    const sellAmount = balance / BigInt(2)
    const sellAmountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [sellAmount, [TOKEN_ADDRESS, WBNB]]
    })
    
    const sellAmountOutMin = sellAmountsOut[1] * (BigInt(10000) - slippageBps) / BigInt(10000)
    
    console.log(`卖出数量: ${formatUnits(sellAmount, Number(decimals))} ${symbol}`)
    console.log(`预期获得: ${formatUnits(sellAmountsOut[1], 18)} BNB`)
    console.log(`最小获得 (${slippagePercent}%): ${formatUnits(sellAmountOutMin, 18)} BNB`)
    
    const sellDeadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    
    const sellHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactTokensForETH',
      args: [sellAmount, sellAmountOutMin, [TOKEN_ADDRESS, WBNB], account.address, sellDeadline],
      gas: BigInt(300000)
    })
    
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash })
    
    if (sellReceipt.status === 'reverted') {
      console.log('❌ 卖出失败\n')
      return false
    }
    
    console.log('✅ 卖出成功')
    console.log(`Gas: ${sellReceipt.gasUsed}\n`)
    
    return true
    
  } catch (error: any) {
    console.error('❌ 异常:', error.shortMessage || error.message)
    return false
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  测试不同滑点对交易的影响                  ║')
  console.log('╚════════════════════════════════════════════╝')
  
  const slippages = [0.5, 1, 5, 10, 20, 50]
  
  for (const slippage of slippages) {
    const success = await testWithSlippage(slippage)
    if (success) {
      console.log(`\n✅ 滑点 ${slippage}% 测试通过！`)
      break
    }
  }
}

main().catch(console.error)
