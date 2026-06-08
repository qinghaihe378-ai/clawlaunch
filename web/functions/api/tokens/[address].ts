import { createPublicClient, http } from 'viem'
import { bsc, bscTestnet } from 'viem/chains'

const FACTORY_ABI = [
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
  }
]

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

const DEPLOYMENTS: Record<number, { factory: string }> = {
  56: { factory: '0xeEDAA1271dc3a5E9D38e76Aee68229ca6B39c3Cd' },
  97: { factory: '0xd0C042eFc846D752f9bE26FB6e0E0D8C666F468C' }
}

const RPC_URLS: Record<number, string> = {
  56: 'https://bsc-dataseed.bnbchain.org',
  97: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'
}

export async function onRequestGet(context: any) {
  const { params, request } = context
  const address = params.address
  const url = new URL(request.url)
  const chainIdParam = url.searchParams.get("chainId") || "56"
  const chainId = parseInt(chainIdParam)

  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(JSON.stringify({
        code: 400,
        msg: "Invalid token address",
        data: null
      }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const rpcUrl = RPC_URLS[chainId]
    const deployment = DEPLOYMENTS[chainId]
    
    if (!rpcUrl || !deployment) {
      return new Response(JSON.stringify({
        code: 400,
        msg: `Unsupported chain: ${chainId}`,
        data: null
      }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const client = createPublicClient({
      transport: http(rpcUrl),
      chain: chainId === 56 ? bsc : bscTestnet
    })

    const factoryAddress = deployment.factory

    const info = await client.readContract({
      address: factoryAddress as `0x${string}`,
      abi: FACTORY_ABI as any,
      functionName: 'tokenInfo',
      args: [address]
    }) as any

    const market = info[1] as `0x${string}`

    const [nameResult, symbolResult, migratedResult, targetRaiseResult] = await Promise.all([
      client.readContract({
        address: address as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'name'
      }).catch(() => 'Unknown'),
      client.readContract({
        address: address as `0x${string}`,
        abi: ERC20_ABI as any,
        functionName: 'symbol'
      }).catch(() => 'UNK'),
      client.readContract({
        address: market,
        abi: MARKET_ABI as any,
        functionName: 'migrated'
      }).catch(() => false),
      client.readContract({
        address: market,
        abi: MARKET_ABI as any,
        functionName: 'targetRaise'
      }).catch(() => 0n)
    ])

    const marketBnb = await client.getBalance({ address: market }).catch(() => 0n)

    return new Response(JSON.stringify({
      code: 200,
      msg: "success",
      data: {
        token: address,
        market,
        creator: info[2],
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
        createdAt: String(info[3])
      }
    }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      }
    })
  } catch (error) {
    console.error('[Token Detail Error]', error)
    return new Response(JSON.stringify({
      code: 500,
      msg: (error as Error).message || "Internal server error",
      data: null
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
