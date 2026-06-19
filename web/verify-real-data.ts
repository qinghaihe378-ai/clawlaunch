import { createPublicClient, http } from 'viem'
import { bscTestnet } from 'viem/chains'

const TESTNET_RPC = 'https://bsc-testnet-dataseed.bnbchain.org'
const WALLET_ADDRESS = '0xFC8DB82fdCDE704Be9025d8feB158F4A2C1Ca5a6' as `0x${string}`

const client = createPublicClient({
  chain: bscTestnet,
  transport: http(TESTNET_RPC)
})

async function checkCurrentStatus() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║  检查当前钱包状态（真实链上数据）          ║')
  console.log('╚════════════════════════════════════════════╝\n')
  
  // BNB 余额
  const bnbBalance = await client.getBalance({ address: WALLET_ADDRESS })
  console.log(`💰 BNB 余额: ${bnbBalance.toString()} wei`)
  console.log(`   = ${(Number(bnbBalance) / 1e18).toFixed(6)} BNB\n`)
  
  // 代币地址
  const tokens = [
    { name: 'ZERO (0精度)', address: '0xaD80e4e966079d4950f14689667376C6a06C745C' as `0x${string}`, decimals: 0 },
    { name: 'NINE (9精度)', address: '0xa10DE74CC01151376c39b1EE32B4E7373b83e028' as `0x${string}`, decimals: 9 },
    { name: 'EIGHTEEN (18精度)', address: '0x778FF6F32B6306e1024c66582E70855c04fCD35d' as `0x${string}`, decimals: 18 },
  ]
  
  const erc20Abi = [{
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }, {
    name: 'symbol', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'string' }]
  }] as const
  
  for (const token of tokens) {
    try {
      const balance = await client.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [WALLET_ADDRESS]
      })
      
      const symbol = await client.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: 'symbol'
      })
      
      const formatted = Number(balance) / Math.pow(10, token.decimals)
      console.log(`🪙 ${symbol} (${token.name}):`)
      console.log(`   原始值: ${balance.toString()}`)
      console.log(`   格式化: ${formatted.toFixed(token.decimals === 0 ? 0 : 6)}`)
      console.log(`   地址: ${token.address}\n`)
    } catch (error: any) {
      console.log(`❌ ${token.name}: 查询失败 - ${error.shortMessage}\n`)
    }
  }
  
  console.log('═'.repeat(50))
  console.log('📝 说明:')
  console.log('  - 以上数据都是从 BSC Testnet 链上实时读取的')
  console.log('  - 不是模拟或调用的数据')
  console.log('  - 您可以在 BSCScan 测试网浏览器验证')
  console.log(`  - 地址: https://testnet.bscscan.com/address/${WALLET_ADDRESS}`)
  console.log('═'.repeat(50))
}

checkCurrentStatus().catch(console.error)
