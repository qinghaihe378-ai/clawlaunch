import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPublicClient, http } from 'viem'
import { bsc } from 'viem/chains'

// Redis 缓存配置（可选）
const REDIS_URL = process.env.REDIS_URL
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '60') // 默认缓存 60 秒

// 简单的内存缓存（如果没有 Redis）
const memoryCache = new Map<string, { data: any; timestamp: number }>()

// Factory ABI
const FACTORY_ABI = [{
  "inputs": [],
  "name": "allTokensLength",
  "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "stateMutability": "view",
  "type": "function"
}, {
  "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
  "name": "allTokens",
  "outputs": [{"internalType": "address", "name": "", "type": "address"}],
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

const FACTORY_ADDRESS = '0x6066e43888D8779322e9ab5dF151b26402807711'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const page = parseInt(req.query.page as string || '1')
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20'), 50)
    const cacheKey = `tokens:${page}:${pageSize}`

    // 尝试从内存缓存读取
    const cached = memoryCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL * 1000) {
      console.log(`[CACHE HIT] ${cacheKey}`)
      return res.status(200).json(cached.data)
    }

    console.log(`[CACHE MISS] ${cacheKey}, fetching from chain...`)

    const client = createPublicClient({
      chain: bsc,
      transport: http('https://bsc-dataseed.bnbchain.org')
    })

    // Get total tokens
    const totalLength = await client.readContract({
      address: FACTORY_ADDRESS as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'allTokensLength'
    })
    const total = Number(totalLength)

    // Get all tokens
    const allRows = []
    for (let i = 0; i < total; i++) {
      try {
        const tokenAddress = await client.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'allTokens',
          args: [BigInt(i)]
        })

        const info = await client.readContract({
          address: FACTORY_ADDRESS as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'tokenInfo',
          args: [tokenAddress]
        }) as any

        const marketAddress = info[1] as `0x${string}`
        
        const [migrated, targetRaise] = await Promise.all([
          client.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'migrated'
          }),
          client.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: 'targetRaise'
          })
        ]) as [boolean, bigint]

        const marketBnb = await client.getBalance({ address: marketAddress })

        const [name, symbol] = await Promise.all([
          client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'name'
          }),
          client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'symbol'
          })
        ])

        allRows.push({
          token: tokenAddress,
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
          marketBnb: marketBnb.toString(),
          targetRaise: targetRaise.toString()
        })
      } catch (e) {
        console.error(`Error fetching token ${i}:`, e)
      }
    }

    // Sort by marketBnb descending
    allRows.sort((a, b) => {
      const aBnb = BigInt(a.marketBnb)
      const bBnb = BigInt(b.marketBnb)
      return aBnb > bBnb ? -1 : aBnb < bBnb ? 1 : 0
    })

    const startIndex = (page - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, allRows.length)
    const rows = allRows.slice(startIndex, endIndex)

    const response = {
      code: 200,
      msg: 'success',
      data: {
        list: rows,
        total: allRows.length,
        visible: rows.length,
        hasMore: endIndex < allRows.length
      }
    }

    // 保存到内存缓存
    memoryCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })

    // 清理过期缓存（保留最近 100 条）
    if (memoryCache.size > 100) {
      const oldestKey = Array.from(memoryCache.keys())[0]
      memoryCache.delete(oldestKey)
    }

    res.status(200).json(response)
  } catch (error: any) {
    console.error('[List Tokens Error]', error)
    res.status(500).json({ code: 500, msg: error.message || 'Internal server error', data: null })
  }
}
