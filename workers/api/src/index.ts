import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createPublicClient, http, formatUnits, parseUnits } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

const app = new Hono()

// CORS 中间件
app.use('/*', cors())

// 合约地址配置（⚠️ 每次重新部署合约后需要更新这里）
const DEPLOYMENTS = {
  56: { // BSC Mainnet
    factory: '0xc411364F32f01fe8b281c0510B09d9d1943eC1F2',
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

// Factory TokenCreated 事件签名
const TOKEN_CREATED_EVENT = 'TokenCreated(address,address,uint8)'

// BSCScan API Key（从环境变量读取）
const BSCSCAN_API_KEY = 'W1KIQ5A6ASG2YER3BUKGJ36UR32E8QMEY2'

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
      list: serializeData(rows),
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

// 验证代币合约
app.get('/api/verify-token', async (c) => {
  try {
    const address = c.req.query('address')
    const templateId = c.req.query('templateId')
    const chainIdParam = c.req.query('chainId')
    
    if (!address || !templateId) {
      return c.json(fail(400, 'Missing address or templateId'), 400)
    }
    
    const chainId = chainIdParam ? parseInt(chainIdParam) : 56
    const isTestnet = chainId === 97
    const bscscanUrl = isTestnet ? 'https://api-testnet.bscscan.com/api' : 'https://api.bscscan.com/api'
    
    // 确定合约路径
    const contractPath = templateId === '0' 
      ? 'contracts/MemeToken.sol:MemeToken'
      : 'contracts/MemeTokenTax.sol:MemeTokenTax'
    
    console.log(`[Verify Token] address=${address}, templateId=${templateId}, chainId=${chainId}`)
    
    // 调用 BSCScan API 进行验证
    const params = new URLSearchParams({
      module: 'contract',
      action: 'verifysourcecode',
      apikey: BSCSCAN_API_KEY,
      contractaddress: address,
      sourceCode: '', // 需要通过 Hardhat 获取源码
      codeformat: 'solidity-single-file',
      contractname: contractPath.split(':')[1],
      compilerversion: 'v0.8.20+commit.a1b79de6',
      optimizationUsed: '1',
      runs: '800',
      constructorArguements: '' // 无构造函数参数
    })
    
    const response = await fetch(`${bscscanUrl}?${params.toString()}`, {
      method: 'POST'
    })
    
    const data = await response.json()
    
    if (data.status === '1') {
      return c.json(ok({
        message: 'Verification submitted successfully',
        guid: data.result,
        statusUrl: `${isTestnet ? 'https://testnet.bscscan.com' : 'https://bscscan.com'}/address/${address}`
      }))
    } else {
      return c.json(fail(400, data.result || 'Verification failed'))
    }
  } catch (error: any) {
    console.error('[Verify Token Error]', error)
    return c.json(fail(500, error.message), 500)
  }
})

// 检查验证状态
app.get('/api/verify-status', async (c) => {
  try {
    const guid = c.req.query('guid')
    const chainIdParam = c.req.query('chainId')
    
    if (!guid) {
      return c.json(fail(400, 'Missing guid'), 400)
    }
    
    const chainId = chainIdParam ? parseInt(chainIdParam) : 56
    const isTestnet = chainId === 97
    const bscscanUrl = isTestnet ? 'https://api-testnet.bscscan.com/api' : 'https://api.bscscan.com/api'
    
    const params = new URLSearchParams({
      module: 'contract',
      action: 'checkverifystatus',
      apikey: BSCSCAN_API_KEY,
      guid: guid
    })
    
    const response = await fetch(`${bscscanUrl}?${params.toString()}`)
    const data = await response.json()
    
    return c.json(ok({
      status: data.status,
      result: data.result
    }))
  } catch (error: any) {
    console.error('[Verify Status Error]', error)
    return c.json(fail(500, error.message), 500)
  }
})

// Cloudflare Workers 标准导出
export default {
  async fetch(request: Request, env: any, ctx: any) {
    return app.fetch(request, env, ctx)
  }
}
