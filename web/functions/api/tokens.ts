import { createPublicClient, http } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

// Factory ABI
const FACTORY_ABI = [
  {
    "inputs": [],
    "name": "allTokensLength",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "allTokens",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "tokenInfo",
    "outputs": [
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "address", "name": "market", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "string", "name": "description", "type": "string"},
      {"internalType": "string", "name": "logo", "type": "string"},
      {"internalType": "string", "name": "telegram", "type": "string"},
      {"internalType": "string", "name": "twitter", "type": "string"},
      {"internalType": "string", "name": "website", "type": "string"},
      {"internalType": "uint256", "name": "templateId", "type": "uint256"},
      {"internalType": "uint256", "name": "taxBps", "type": "uint256"},
      {"internalType": "uint256", "name": "burnShareBps", "type": "uint256"},
      {"internalType": "uint256", "name": "holderShareBps", "type": "uint256"},
      {"internalType": "uint256", "name": "liquidityShareBps", "type": "uint256"},
      {"internalType": "uint256", "name": "buybackShareBps", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// Market ABI
const MARKET_ABI = [
  {
    "inputs": [],
    "name": "migrated",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "targetRaise",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}],
    "name": "quoteBuy",
    "outputs": [
      {"internalType": "uint256", "name": "tokensOut", "type": "uint256"},
      {"internalType": "uint256", "name": "priceImpact", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

// ERC20 ABI
const ERC20_ABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]

const DEPLOYMENTS = {
  56: {
    factory: '0xeEDAA1271dc3a5E9D38e76Aee68229ca6B39c3Cd'
  },
  97: {
    factory: '0xd0C042eFc846D752f9bE26FB6e0E0D8C666F468C'
  }
}

const RPC_URLS = {
  56: 'https://bsc-dataseed.bnbchain.org',
  97: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'
}

export async function onRequestGet(context: any) {
  const { request } = context
  const url = new URL(request.url)
  
  const version = url.searchParams.get("version") || "v1"
  const chainIdParam = url.searchParams.get("chainId") || "56"
  const pageParam = url.searchParams.get("page") || "1"
  const pageSizeParam = url.searchParams.get("pageSize") || "20"
  
  const chainId = parseInt(chainIdParam)
  const page = Math.max(1, parseInt(pageParam))
  const pageSize = Math.min(Math.max(1, parseInt(pageSizeParam)), 50)

  try {
    const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS]
    const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS]
    
    if (!rpcUrl || !deployment) {
      return new Response(JSON.stringify({
        code: 400,
        msg: `Unsupported chain: ${chainId}`,
        data: null
      }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        }
      })
    }

    const client = createPublicClient({
      transport: http(rpcUrl),
      chain: chainId === 56 ? bsc : bscTestnet
    })

    const factoryAddress = deployment.factory

    // 获取代币总数
    const length = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI as any,
      functionName: 'allTokensLength'
    })

    const total = Number(length)
    const safePage = page
    const safePageSize = pageSize
    const endExclusive = total - (safePage - 1) * safePageSize
    const start = Math.max(0, endExclusive - safePageSize)
    const count = Math.max(0, endExclusive - start)

    if (count === 0) {
      return new Response(JSON.stringify({
        code: 200,
        msg: "success",
        data: {
          version,
          chainId,
          factory: factoryAddress,
          total,
          page: safePage,
          pageSize: safePageSize,
          list: []
        }
      }), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type": "application/json"
        }
      })
    }

    // 批量获取代币地址
    const indexes = Array.from({ length: count }, (_, i) => BigInt(start + i))
    const tokenAddressesResults = await client.multicall({
      contracts: indexes.map((index) => ({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI as any,
        functionName: 'allTokens',
        args: [index]
      }))
    }) as any

    const tokenAddresses = (tokenAddressesResults as any[])
      .map((item: any) => item.result)
      .filter((addr: any): addr is string => addr !== undefined)
      .reverse()

    // 批量获取代币信息
    const list = await Promise.all(
      tokenAddresses.map(async (token: string) => {
        try {
          const info = await client.readContract({
            address: factoryAddress as `0x${string}`,
            abi: FACTORY_ABI as any,
            functionName: 'tokenInfo',
            args: [token]
          }) as any

          const market = info[1]
          const creator = info[2]

          // 并行查询市场信息和代币名称/符号
          const [nameResult, symbolResult, migratedResult, targetRaiseResult] = await Promise.all([
            client.readContract({
              address: token as `0x${string}`,
              abi: ERC20_ABI as any,
              functionName: 'name'
            }).catch(() => 'Unknown'),
            client.readContract({
              address: token as `0x${string}`,
              abi: ERC20_ABI as any,
              functionName: 'symbol'
            }).catch(() => 'UNK'),
            client.readContract({
              address: market as `0x${string}`,
              abi: MARKET_ABI as any,
              functionName: 'migrated'
            }).catch(() => false),
            client.readContract({
              address: market as `0x${string}`,
              abi: MARKET_ABI as any,
              functionName: 'targetRaise'
            }).catch(() => 0n)
          ])

          // 获取市场 BNB 余额
          const marketBnb = await client.getBalance({ address: market as `0x${string}` }).catch(() => 0n)

          // 获取报价（仅未迁移的代币）
          let quotePriceBnbPerToken = undefined
          if (!migratedResult) {
            try {
              const quote = await client.readContract({
                address: market as `0x${string}`,
                abi: MARKET_ABI as any,
                functionName: 'quoteBuy',
                args: [10n ** 17n] // 0.1 BNB
              }) as any
              const tokensOut = quote[0]
              if (tokensOut > 0n) {
                quotePriceBnbPerToken = (10n ** 17n) / tokensOut
              }
            } catch (e) {
              console.error('Failed to get quote:', e)
            }
          }

          return {
            token,
            market,
            creator,
            name: nameResult,
            symbol: symbolResult,
            description: info[4],
            logo: info[5],
            telegram: info[6],
            twitter: info[7],
            website: info[8],
            templateId: String(info[9]),
            taxBps: String(info[10]),
            burnShareBps: String(info[11]),
            holderShareBps: String(info[12]),
            liquidityShareBps: String(info[13]),
            buybackShareBps: String(info[14]),
            migrated: migratedResult,
            marketBnb: String(marketBnb),
            targetRaise: String(targetRaiseResult),
            quotePriceBnbPerToken: quotePriceBnbPerToken ? String(quotePriceBnbPerToken) : undefined
          }
        } catch (e) {
          console.error(`Failed to process token ${token}:`, e)
          return null
        }
      })
    )

    const filteredList = list.filter((item) => item !== null)

    return new Response(JSON.stringify({
      code: 200,
      msg: "success",
      data: {
        version,
        chainId,
        factory: factoryAddress,
        total,
        page: safePage,
        pageSize: safePageSize,
        list: filteredList
      }
    }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
      }
    })
  } catch (error) {
    console.error('[List Tokens Error]', error)
    return new Response(JSON.stringify({
      code: 500,
      msg: (error as Error).message || "Internal server error",
      data: null
    }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      }
    })
  }
}
