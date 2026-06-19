import { createPublicClient, http, parseUnits, formatUnits } from 'viem'
import { bsc } from 'viem/chains'

const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E' as `0x${string}`
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`

// 杀零猫代币 (0精度)
const TOKEN_ADDRESS = '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`

const client = createPublicClient({
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
  name: 'allowance', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' }
  ], outputs: [{ name: '', type: 'uint256' }]
}] as const

const routerAbi = [{
  name: 'getAmountsOut', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'amountIn', type: 'uint256' },
    { name: 'path', type: 'address[]' }
  ], outputs: [{ name: 'amounts', type: 'uint256[]' }]
}] as const

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  诊断自定义代币卖出问题                    ║')
  console.log('╚════════════════════════════════════════════╝\n')
  
  // 查询代币信息
  console.log('=== 代币信息 ===\n')
  
  const symbol = await client.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol'
  })
  
  const decimals = await client.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals'
  })
  
  console.log('Symbol:', symbol)
  console.log('Decimals:', decimals)
  console.log('地址:', TOKEN_ADDRESS)
  
  // 测试报价查询
  console.log('\n=== 测试报价查询 ===\n')
  
  const testAmount = '1'
  const amountIn = parseUnits(testAmount, Number(decimals))
  
  console.log('测试卖出:', testAmount, symbol)
  console.log('amountIn:', amountIn.toString())
  
  try {
    const amountsOut = await client.readContract({
      address: ROUTER,
      abi: routerAbi,
      functionName: 'getAmountsOut',
      args: [amountIn, [TOKEN_ADDRESS, WBNB]]
    })
    
    console.log('✅ 报价查询成功!')
    console.log('可获得 BNB:', formatUnits(amountsOut[1], 18))
    console.log('\n这说明:')
    console.log('  - 交易对存在')
    console.log('  - 有流动性')
    console.log('  - Router 可以正常计算报价')
    
  } catch (error: any) {
    console.error('❌ 报价查询失败:', error.shortMessage || error.message)
    console.error('\n可能原因:')
    console.error('  - 交易对不存在')
    console.error('  - 流动性不足')
    console.error('  - 代币合约有问题')
    return
  }
  
  // 检查授权逻辑
  console.log('\n=== 授权检查说明 ===\n')
  
  console.log('如果您在前端遇到"卖不了"的问题，可能是:')
  console.log('  1. 授权额度不足')
  console.log('     - 前端已修复：使用 max uint256 授权')
  console.log('  2. 余额不足')
  console.log('     - 请检查钱包是否有足够的代币')
  console.log('  3. Gas 估算失败')
  console.log('     - 前端已添加显式 Gas 限制')
  console.log('  4. 滑点设置过低')
  console.log('     - 建议设置为 0.5% - 1%')
  
  console.log('\n=== 下一步 ===\n')
  console.log('请在浏览器中:')
  console.log('  1. 刷新页面 (http://localhost:5174)')
  console.log('  2. 打开控制台 (F12)')
  console.log('  3. 尝试卖出代币')
  console.log('  4. 查看控制台的 [卖出检查] 日志')
  console.log('  5. 把日志复制给我')
}

main().catch(console.error)
