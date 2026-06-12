import express from 'express'
import cors from 'cors'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

const app = express()
const PORT = process.env.PORT || 3001

// CORS 中间件
app.use(cors())
app.use(express.json())

// 合约地址配置
const DEPLOYMENTS = {
  56: { // BSC Mainnet
    factory: '0x6066e43888D8779322e9ab5dF151b26402807711',
    wbnb: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  },
  97: { // BSC Testnet
    factory: '0xd0C042eFc846D752f9bE26FB6e0E0D8C666F468C',
    wbnb: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    router: '0x9ac64cc6e4415144c455bd8e4837fea55603e5c3'
  }
}

// RPC URL 配置
const RPC_URLS = {
  56: [
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed1.bnbchain.org',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com'
  ],
  97: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545']
}

// Factory ABI
const FACTORY_ABI = [{
  "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "name": "allTokens",
  "outputs": [{"internalType": "address", "name": "", "type": "address"}],
  "stateMutability": "view",
  "type": "function"
}, {
  "inputs": [],
  "name": "allTokensLength",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
}, {
  "inputs": [{"internalType": "address", "name": "", "type": "address"}],
  "name": "tokenInfo",
  "outputs": [
    {"internalType": "address", "name": "token", "type": "address"},
    {"internalType": "address", "name": "market", "type": "address"},
    {"internalType": "address", "name": "creator", "type": "address"},
    {"internalType": "uint40", "name": "createdAt", "type": "uint40"},
    {"internalType": "string", "name": "description", "type": "string"},
    {"internalType": "string", "name": "logo", "type": "string"},
    {"internalType": "string", "name": "telegram", "type": "string"},
    {"internalType": "string", "name": "twitter", "type": "string"},
    {"internalType": "string", "name": "website", "type": "string"},
    {"internalType": "uint8", "name": "templateId", "type": "uint8"},
    {"internalType": "uint16", "name": "taxBps", "type": "uint16"},
    {"internalType": "uint16", "name": "burnShareBps", "type": "uint16"},
    {"internalType": "uint16", "name": "holderShareBps", "type": "uint16"},
    {"internalType": "uint16", "name": "liquidityShareBps", "type": "uint16"},
    {"internalType": "uint16", "name": "buybackShareBps", "type": "uint16"}
  ],
  "stateMutability": "view",
  "type": "function"
}]

// Market ABI
const MARKET_ABI = [{
  "inputs": [],
  "name": "migrated",
  "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
  "stateMutability": "view",
  "type": "function"
}, {
  "inputs": [],
  "name": "targetRaise",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
}, {
  "inputs": [],
  "name": "getReserves",
  "outputs": [
    {"internalType": "uint256", "name": "tokenReserve", "type": "uint256"},
    {"internalType": "uint256", "name": "bnbReserve", "type": "uint256"}
  ],
  "stateMutability": "view",
  "type": "function"
}]

// ERC20 ABI
const ERC20_ABI = [{
  "inputs": [],
  "name": "name",
  "outputs": [{"internalType": "string", "name": "", "type": "string"}],
  "stateMutability": "view",
  "type": "function"
}, {
  "inputs": [],
  "name": "symbol",
  "outputs": [{"internalType": "string", "name": "", "type": "string"}],
  "stateMutability": "view",
  "type": "function"
}]

// Helper: 获取 Public Client
function getPublicClient(chainId: number) {
  const rpcUrls = RPC_URLS[chainId as keyof typeof RPC_URLS] || RPC_URLS[56]
  const rpcUrl = Array.isArray(rpcUrls) ? rpcUrls[0] : rpcUrls
  const chain = chainId === 97 ? bscTestnet : bsc
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  })
}

// Helper: 成功响应
function ok(data: any) {
  return { code: 200, msg: "success", data }
}

// Helper: 失败响应
function fail(status: number, message: string) {
  return { code: status, msg: message, data: null }
}

// Helper: 序列化 bigint
function serializeData(data: any): any {
  if (typeof data === 'bigint') return data.toString()
  if (Array.isArray(data)) return data.map(serializeData)
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, serializeData(value)])
    )
  }
  return data
}

// /api/health
app.get('/api/health', async (req, res) => {
  res.json(ok({ status: 'ok' }))
})

// /api/factories
app.get('/api/factories', async (req, res) => {
  try {
    const factories = [
      {
        version: 'v1',
        chains: [
          { chainId: 56, name: 'BSC Mainnet', address: DEPLOYMENTS[56].factory },
          { chainId: 97, name: 'BSC Testnet', address: DEPLOYMENTS[97].factory }
        ]
      }
    ]
    res.json(ok({ list: factories }))
  } catch (error: any) {
    res.status(500).json(fail(500, error.message))
  }
})

// /api/tokens
app.get('/api/tokens', async (req, res) => {
  try {
    const chainId = parseInt(req.query.chainId as string || '56')
    const page = parseInt(req.query.page as string || '1')
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20'), 50)

    const client = getPublicClient(chainId)
    const factoryAddress = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS]?.factory

    if (!factoryAddress) {
      return res.status(400).json(fail(400, `Unsupported chainId: ${chainId}`))
    }

    console.log('[DEBUG] Starting token query, chainId:', chainId, 'factory:', factoryAddress)
    
    const totalLength = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'allTokensLength'
    })
    const total = Number(totalLength)
    console.log('[DEBUG] Total tokens from factory:', total)
    
    const allRows = []
    for (let i = 0; i < total; i++) {
      try {
        const tokenAddress = await client.readContract({
          address: factoryAddress as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'allTokens',
          args: [BigInt(i)]
        })

        const info = await client.readContract({
          address: factoryAddress as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'tokenInfo',
          args: [tokenAddress]
        })

        const marketAddress = info[1] as `0x${string}`
        let migrated = false
        let marketBnb = 0n
        let targetRaise = 0n

        try {
          migrated = await client.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'migrated'
          })

          targetRaise = await client.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'targetRaise'
          })

          const rpcUrls = RPC_URLS[chainId as keyof typeof RPC_URLS] || RPC_URLS[56]
          const urls = Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls]
          
          let success = false
          for (const rpcUrl of urls) {
            try {
              const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'eth_getBalance',
                  params: [marketAddress, 'latest'],
                  id: 1
                })
              })
              const rpcData = await rpcResponse.json() as any
              if (rpcData.result) {
                marketBnb = BigInt(rpcData.result)
                console.log(`[DEBUG] Market balance for ${marketAddress}:`, marketBnb.toString())
                success = true
                break
              }
            } catch (e) {
              continue
            }
          }
          
          if (!success) {
            marketBnb = 0n
          }
        } catch (e) {
          console.error(`Error fetching market info for ${tokenAddress}:`, e)
        }

        let quotePriceBnbPerToken = undefined
        if (marketBnb > 0n) {
          const tokenReserve = await client.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'getReserves'
          }).then(r => r[0])
          
          if (tokenReserve > 0n) {
            quotePriceBnbPerToken = (marketBnb * BigInt(1e18)) / tokenReserve
          }
        }

        allRows.push({
          token: tokenAddress,
          market: info[1],
          creator: info[2],
          name: '',
          symbol: '',
          description: info[4],
          logo: info[5],
          telegram: info[6],
          twitter: info[7],
          website: info[8],
          templateId: info[9],
          taxBps: info[10],
          burnShareBps: info[11],
          holderShareBps: info[12],
          liquidityShareBps: info[13],
          buybackShareBps: info[14],
          migrated,
          marketBnb,
          targetRaise,
          quotePriceBnbPerToken
        })
      } catch (e) {
        console.error(`Error fetching token ${i}:`, e)
      }
    }

    const filteredTotal = allRows.length
    console.log(`[DEBUG] Total tokens: ${total}, Filtered: ${filteredTotal}`)
    
    allRows.sort((a, b) => {
      const aBnb = BigInt(a.marketBnb)
      const bBnb = BigInt(b.marketBnb)
      return aBnb > bBnb ? -1 : aBnb < bBnb ? 1 : 0
    })
    
    const startIndex = (page - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, filteredTotal)
    const rows = allRows.slice(startIndex, endIndex)

    await Promise.all(rows.map(async (row) => {
      try {
        const [name, symbol] = await Promise.all([
          client.readContract({
            address: row.token,
            abi: ERC20_ABI,
            functionName: 'name'
          }),
          client.readContract({
            address: row.token,
            abi: ERC20_ABI,
            functionName: 'symbol'
          })
        ])
        row.name = name
        row.symbol = symbol
      } catch (e) {
        row.name = 'Unknown'
        row.symbol = '???'
      }
    }))

    res.json(ok({
      list: serializeData(rows),
      total: filteredTotal,
      visible: rows.length,
      hasMore: endIndex < filteredTotal
    }))
  } catch (error: any) {
    console.error('[List Tokens Error]', error)
    res.status(500).json(fail(500, error.message))
  }
})

// /api/tokens/:address
app.get('/api/tokens/:address', async (req, res) => {
  try {
    const address = req.params.address
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json(fail(400, 'Invalid token address'))
    }

    const chainId = parseInt(req.query.chainId as string || '56')
    const client = getPublicClient(chainId)
    const factoryAddress = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS]?.factory

    if (!factoryAddress) {
      return res.status(400).json(fail(400, `Unsupported chainId: ${chainId}`))
    }

    const info = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'tokenInfo',
      args: [address as `0x${string}`]
    })

    const marketAddress = info[1] as `0x${string}`
    
    const [migrated, targetRaise, reserves] = await Promise.all([
      client.readContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: 'migrated'
      }),
      client.readContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: 'targetRaise'
      }),
      client.readContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: 'getReserves'
      })
    ])

    const marketBnb = reserves[1]
    const tokenReserve = reserves[0]

    const [name, symbol] = await Promise.all([
      client.readContract({
        address: address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'name'
      }),
      client.readContract({
        address: address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'symbol'
      })
    ])

    let quotePriceBnbPerToken = undefined
    if (marketBnb > 0n) {
      const reserves = await client.readContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: 'getReserves'
      })
      const tokenReserve = reserves[0]
      if (tokenReserve > 0n) {
        quotePriceBnbPerToken = (marketBnb * BigInt(1e18)) / tokenReserve
      }
    }

    const result = {
      token: address,
      market: marketAddress,
      creator: info[2],
      name,
      symbol,
      description: info[4],
      logo: info[5],
      telegram: info[6],
      twitter: info[7],
      website: info[8],
      templateId: info[9],
      taxBps: info[10],
      burnShareBps: info[11],
      holderShareBps: info[12],
      liquidityShareBps: info[13],
      buybackShareBps: info[14],
      migrated,
      marketBnb,
      targetRaise,
      quotePriceBnbPerToken
    }

    res.json(ok(serializeData(result)))
  } catch (error: any) {
    console.error('[Token Detail Error]', error)
    res.status(500).json(fail(500, error.message))
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`)
})

export default app
