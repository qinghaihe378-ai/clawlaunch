import { createPublicClient, http, formatUnits } from 'viem'
import { bsc } from 'viem/chains'

const MAINNET_RPC = 'https://bsc-dataseed.bnbchain.org'
const TOKEN_ADDRESS = '0x7c1df8f49c1579ce8c03486edfe506a7f9150000' as `0x${string}`
const WALLET = '0x13E06a03AF8637a7374d3Ad7b282f852feD3F79C' as `0x${string}`
const BUY_TX = '0x04c92454071d7b49e60f32fb7a4a35d18de77ef2b765eda70b8117552c85a125'

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
  name: 'balanceOf', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
}] as const

async function main() {
  console.log('🔍 检查买入交易详情\n')
  
  // 获取交易收据
  const receipt = await client.getTransactionReceipt({ hash: BUY_TX })
  console.log('交易状态:', receipt.status)
  console.log('Gas 使用:', receipt.gasUsed.toString())
  console.log()
  
  // 查找 Transfer 事件
  const transferLogs = receipt.logs.filter(log => {
    return log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
  })
  
  console.log(`找到 ${transferLogs.length} 个 Transfer 事件:\n`)
  
  for (let i = 0; i < transferLogs.length; i++) {
    const log = transferLogs[i]
    const from = '0x' + (log.topics[1] || '').slice(26)
    const to = '0x' + (log.topics[2] || '').slice(26)
    const value = BigInt(log.data)
    
    const decimals = await client.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'decimals'
    })
    const symbol = await client.readContract({
      address: TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'symbol'
    })
    
    console.log(`Transfer #${i + 1}:`)
    console.log(`  From: ${from}`)
    console.log(`  To:   ${to}`)
    console.log(`  Value: ${formatUnits(value, Number(decimals))} ${symbol}`)
    console.log(`  Raw:  ${value.toString()}`)
    console.log()
  }
  
  // 检查当前余额
  const balance = await client.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [WALLET]
  })
  const decimals = await client.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'decimals'
  })
  const symbol = await client.readContract({
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'symbol'
  })
  
  console.log(`\n📊 当前余额:`)
  console.log(`   ${symbol}: ${formatUnits(balance, Number(decimals))}`)
  console.log(`   Raw: ${balance.toString()}`)
  
  if (balance === 0n) {
    console.log('\n⚠️  余额为 0！可能原因:')
    console.log('   1. 代币有高额转账税（买入时被扣光）')
    console.log('   2. 代币合约有特殊逻辑')
    console.log('   3. 买入交易实际失败了（虽然状态是 success）')
  } else {
    console.log('\n✅ 余额正常，可以卖出')
  }
}

main().catch(console.error)
