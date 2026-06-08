import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

const app = new Hono()

// CORS 中间件
app.use('/*', cors())

// 合约地址配置
const DEPLOYMENTS = {
  56: { // BSC Mainnet
    factory: '0xeEDAA1271dc3a5E9D38e76Aee68229ca6B39c3Cd',
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
  56: 'https://bsc-dataseed.bnbchain.org',
  97: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'
}

// Factory ABI（简化版，只包含需要的方法）
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

// Market ABI（简化版）
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
  const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS] || RPC_URLS[56]
  const chain = chainId === 97 ? bscTestnet : bsc
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  })
}

// Helper: 成功响应（前端期望的格式）
function ok(data: any) {
  return { code: 200, msg: "success", data }
}

// Helper: 失败响应（前端期望的格式）
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
app.get('/api/health', async (c) => {
  return c.json(ok({ status: 'ok' }))
})

// /api/factories
app.get('/api/factories', async (c) => {
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
    return c.json(ok({ list: factories }))
  } catch (error: any) {
    return c.json(fail(500, error.message), 500)
  }
})

// /api/tokens
app.get('/api/tokens', async (c) => {
  try {
    const version = c.req.query('version') || 'v1'
    const chainId = parseInt(c.req.query('chainId') || '56')
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = Math.min(parseInt(c.req.query('pageSize') || '20'), 50)

    const client = getPublicClient(chainId)
    const factoryAddress = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS]?.factory

    if (!factoryAddress) {
      return c.json(fail(400, `Unsupported chainId: ${chainId}`), 400)
    }

    // 获取代币总数
    const totalLength = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'allTokensLength'
    })

    const total = Number(totalLength)
    const startIndex = (page - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, total)

    // 获取代币列表
    const rows = []
    for (let i = startIndex; i < endIndex; i++) {
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

        // 获取市场信息
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

          const reserves = await client.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'getReserves'
          })
          marketBnb = reserves[1] // bnbReserve
        } catch (e) {
          // 忽略市场查询错误
        }

        // 计算价格
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

        rows.push({
          token: tokenAddress,
          market: info[1],
          creator: info[2],
          name: '', // 需要从 ERC20 查询
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

    // 并行查询代币名称和符号
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

    return c.json(ok({
      rows: serializeData(rows),
      total,
      visible: rows.length,
      hasMore: endIndex < total
    }))
  } catch (error: any) {
    console.error('[List Tokens Error]', error)
    return c.json(fail(500, error.message), 500)
  }
})

// /api/tokens/:address
app.get('/api/tokens/:address', async (c) => {
  try {
    const address = c.req.param('address')
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json(fail(400, 'Invalid token address'), 400)
    }

    const chainId = parseInt(c.req.query('chainId') || '56')
    const client = getPublicClient(chainId)
    const factoryAddress = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS]?.factory

    if (!factoryAddress) {
      return c.json(fail(400, `Unsupported chainId: ${chainId}`), 400)
    }

    // 获取代币信息
    const info = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'tokenInfo',
      args: [address as `0x${string}`]
    })

    const marketAddress = info[1] as `0x${string}`
    
    // 获取市场信息
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

    // 获取代币名称和符号
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

    // 计算价格
    let quotePriceBnbPerToken = undefined
    if (marketBnb > 0n && tokenReserve > 0n) {
      quotePriceBnbPerToken = (marketBnb * BigInt(1e18)) / tokenReserve
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

    return c.json(ok(serializeData(result)))
  } catch (error: any) {
    console.error('[Token Detail Error]', error)
    return c.json(fail(500, error.message), 500)
  }
})

export default app
