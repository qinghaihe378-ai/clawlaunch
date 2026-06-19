import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// 配置 - 主网
const PRIVATE_KEY = '0x0fcd3c6f3e21ada0bfb772cae7a6735234b5aafb0c4e4df1cf04bf725a50c8d9'
const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`

// 测试的两个代币
const TOKENS = [
  { address: '0x243711d7e281aafd8f5b16914649ff96abd27777' as `0x${string}`, name: '战略储备' },
  { address: '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`, name: '杀零猫' },
]

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
}, {
  name: 'getAmountsOut', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ], outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

async function testToken(tokenAddress: `0x${string}`, tokenName: string) {
  console.log('\n' + '='.repeat(60))
  console.log(`🧪 测试代币: ${tokenName}`)
  console.log(`地址: ${tokenAddress}`)
  console.log('='.repeat(60) + '\n')
  
  // 获取代币信息
  const symbol = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol'
  })
  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals'
  })
  
  console.log(`代币: ${symbol} (${decimals} 精度)\n`)
  
  let totalGasUsed = BigInt(0)
  
  // 1. 买入 (0.0001 BNB)
  console.log('💰 步骤 1: 买入 (0.0001 BNB)')
  try {
    const buyAmount = parseUnits('0.0001', 18)
    const amountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [buyAmount, [WBNB, tokenAddress]]
    })
    console.log(`   预期获得: ${formatUnits(amountsOut[1], Number(decimals))} ${symbol}`)
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const amountOutMin = amountsOut[1] * BigInt(9950) / BigInt(10000)
    
    const buyHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, [WBNB, tokenAddress], account.address, deadline],
      value: buyAmount,
      gas: BigInt(300000)
    })
    
    const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyHash })
    
    if (buyReceipt.status === 'reverted') {
      console.log('   ❌ 买入失败 (Reverted)')
      console.log('   Gas 消耗:', buyReceipt.gasUsed.toString())
      totalGasUsed += buyReceipt.gasUsed
      return null
    }
    
    console.log('   ✅ 买入成功')
    console.log('   Gas 消耗:', buyReceipt.gasUsed.toString())
    totalGasUsed += buyReceipt.gasUsed
    
    const balanceAfterBuy = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address]
    })
    console.log(`   余额: ${formatUnits(balanceAfterBuy, Number(decimals))} ${symbol}\n`)
    
    // 2. 授权
    console.log('🔐 步骤 2: 授权 Router')
    const maxApproval = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')
    
    const approveHash = await walletClient.writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ROUTER, maxApproval],
      gas: BigInt(100000)
    })
    
    const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash })
    
    if (approveReceipt.status === 'reverted') {
      console.log('   ❌ 授权失败 (Reverted)')
      console.log('   Gas 消耗:', approveReceipt.gasUsed.toString())
      totalGasUsed += approveReceipt.gasUsed
      return null
    }
    
    console.log('   ✅ 授权成功')
    console.log('   Gas 消耗:', approveReceipt.gasUsed.toString())
    totalGasUsed += approveReceipt.gasUsed
    console.log()
    
    // 3. 卖出 (卖出一半)
    console.log('💸 步骤 3: 卖出 (卖出一半)')
    const sellAmount = balanceAfterBuy / BigInt(2)
    console.log(`   卖出数量: ${formatUnits(sellAmount, Number(decimals))} ${symbol}`)
    
    const sellAmountsOut = await publicClient.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [sellAmount, [tokenAddress, WBNB]]
    })
    console.log(`   预期获得: ${formatUnits(sellAmountsOut[1], 18)} BNB`)
    
    const sellDeadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const sellAmountOutMin = sellAmountsOut[1] * BigInt(9950) / BigInt(10000)
    
    const sellHash = await walletClient.writeContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'swapExactTokensForETH',
      args: [sellAmount, sellAmountOutMin, [tokenAddress, WBNB], account.address, sellDeadline],
      gas: BigInt(300000)
    })
    
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash })
    
    if (sellReceipt.status === 'reverted') {
      console.log('   ❌ 卖出失败 (Reverted)')
      console.log('   Gas 消耗:', sellReceipt.gasUsed.toString())
      totalGasUsed += sellReceipt.gasUsed
      
      // 即使卖出失败，继续测试添加流动性
      console.log('   ⚠️  跳过卖出，继续测试添加流动性\n')
    } else {
      console.log('   ✅ 卖出成功')
      console.log('   Gas 消耗:', sellReceipt.gasUsed.toString())
      totalGasUsed += sellReceipt.gasUsed
      console.log()
    }
    
    // 4. 添加流动性 (0.0001 BNB)
    console.log('➕ 步骤 4: 添加流动性 (0.0001 BNB)')
    try {
      const addEthAmount = parseUnits('0.0001', 18)
      
      // 先查询需要多少代币
      const addAmountsOut = await publicClient.readContract({
        address: ROUTER,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: [addEthAmount, [WBNB, tokenAddress]]
      })
      const tokenAmount = addAmountsOut[1]
      
      console.log(`   添加: ${formatUnits(tokenAmount, Number(decimals))} ${symbol} + 0.0001 BNB`)
      
      const addDeadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
      const amountTokenMin = tokenAmount * BigInt(9950) / BigInt(10000)
      const amountETHMin = addEthAmount * BigInt(9950) / BigInt(10000)
      
      const addHash = await walletClient.writeContract({
        address: ROUTER,
        abi: routerAbi,
        functionName: 'addLiquidityETH',
        args: [tokenAddress, tokenAmount, amountTokenMin, amountETHMin, account.address, addDeadline],
        value: addEthAmount,
        gas: BigInt(3000000)
      })
      
      const addReceipt = await publicClient.waitForTransactionReceipt({ hash: addHash })
      
      if (addReceipt.status === 'reverted') {
        console.log('   ❌ 添加流动性失败 (Reverted)')
        console.log('   Gas 消耗:', addReceipt.gasUsed.toString())
        totalGasUsed += addReceipt.gasUsed
      } else {
        console.log('   ✅ 添加流动性成功')
        console.log('   Gas 消耗:', addReceipt.gasUsed.toString())
        totalGasUsed += addReceipt.gasUsed
        
        // 获取 LP token 余额
        const pairFactoryAbi = [{
          name: 'getPair', type: 'function', stateMutability: 'view',
          inputs: [
            { name: 'tokenA', type: 'address' },
            { name: 'tokenB', type: 'address' }
          ], outputs: [{ name: 'pair', type: 'address' }]
        }] as const
        
        const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73' as `0x${string}`
        
        const pairAddress = await publicClient.readContract({
          address: FACTORY,
          abi: pairFactoryAbi,
          functionName: 'getPair',
          args: [tokenAddress < WBNB ? tokenAddress : WBNB, tokenAddress < WBNB ? WBNB : tokenAddress]
        })
        
        if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
          const lpBalance = await publicClient.readContract({
            address: pairAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [account.address]
          })
          console.log(`   LP Token 余额: ${formatUnits(lpBalance, 18)}\n`)
          
          // 5. 移除流动性
          console.log('➖ 步骤 5: 移除流动性')
          if (lpBalance > BigInt(0)) {
            const removeDeadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
            
            const removeHash = await walletClient.writeContract({
              address: ROUTER,
              abi: routerAbi,
              functionName: 'removeLiquidityETH',
              args: [tokenAddress, lpBalance, BigInt(0), BigInt(0), account.address, removeDeadline],
              gas: BigInt(400000)
            })
            
            const removeReceipt = await publicClient.waitForTransactionReceipt({ hash: removeHash })
            
            if (removeReceipt.status === 'reverted') {
              console.log('   ❌ 移除流动性失败 (Reverted)')
              console.log('   Gas 消耗:', removeReceipt.gasUsed.toString())
              totalGasUsed += removeReceipt.gasUsed
            } else {
              console.log('   ✅ 移除流动性成功')
              console.log('   Gas 消耗:', removeReceipt.gasUsed.toString())
              totalGasUsed += removeReceipt.gasUsed
            }
          } else {
            console.log('   ⚠️  没有 LP Token，跳过移除流动性\n')
          }
        }
      }
    } catch (error: any) {
      console.log('   ❌ 添加流动性异常:', error.shortMessage || error.message)
    }
    
    console.log()
    console.log(`📊 总 Gas 消耗: ${totalGasUsed.toString()}`)
    console.log(`   约合 BNB: ${formatUnits(totalGasUsed * BigInt(5000000000), 18)} (按 5 gwei)` )
    
    return {
      symbol,
      decimals,
      totalGasUsed
    }
    
  } catch (error: any) {
    console.error('   ❌ 测试异常:', error.shortMessage || error.message)
    console.error('   详细信息:', error.details || error)
    return null
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  主网完整测试 - 自定义代币买卖+流动性      ║')
  console.log('╚════════════════════════════════════════════╝\n')
  
  // 检查初始余额
  const initialBnb = await publicClient.getBalance({ address: account.address })
  console.log(`钱包地址: ${account.address}`)
  console.log(`初始 BNB: ${formatUnits(initialBnb, 18)}\n`)
  
  const results = []
  
  for (const token of TOKENS) {
    const result = await testToken(token.address, token.name)
    if (result) {
      results.push(result)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📈 测试总结')
  console.log('='.repeat(60))
  
  if (results.length > 0) {
    console.log('\n✅ 成功测试的代币:')
    for (const r of results) {
      console.log(`   - ${r.symbol} (${r.decimals} 精度)`)
    }
    
    const finalBnb = await publicClient.getBalance({ address: account.address })
    const consumed = initialBnb - finalBnb
    console.log(`\n总 BNB 消耗: ${formatUnits(consumed, 18)} BNB`)
    console.log(`约合 USD: $${(Number(formatUnits(consumed, 18)) * 600).toFixed(4)} (按 $600/BNB)`)
  } else {
    console.log('\n❌ 所有测试都失败了')
  }
}

main().catch(console.error)
