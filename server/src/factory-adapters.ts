import type { Address } from "viem"

import { bondingCurveMarketAbi, erc20Abi, memeTokenFactoryAbi } from "./abi.js"
import { getFactoryAddress, getPublicClient, type FactoryVersion, type SupportedChainId } from "./config.js"

type TokenInfoResult = readonly [
  Address,
  Address,
  Address,
  bigint,
  string,
  string,
  string,
  string,
  string,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint
]

export type TokenListItem = {
  token: Address
  market: Address
  creator: Address
  name: string
  symbol: string
  description: string
  logo: string
  telegram: string
  twitter: string
  website: string
  templateId: bigint
  taxBps: bigint
  burnShareBps: bigint
  holderShareBps: bigint
  liquidityShareBps: bigint
  buybackShareBps: bigint
  migrated: boolean
  marketBnb: bigint
  targetRaise: bigint
  quotePriceBnbPerToken?: bigint
}

export type TokenListResult = {
  version: FactoryVersion
  chainId: SupportedChainId
  factory: Address
  total: number
  page: number
  pageSize: number
  list: TokenListItem[]
}

export type TokenDetail = TokenListItem & {
  version: FactoryVersion
  chainId: SupportedChainId
  factory: Address
  createdAt: bigint
}

export interface FactoryAdapter {
  version: FactoryVersion
  listTokens(input: { chainId: SupportedChainId; page: number; pageSize: number }): Promise<TokenListResult>
  getTokenDetail(input: { chainId: SupportedChainId; token: Address }): Promise<TokenDetail>
}

function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(value)
  return BigInt(value as string)
}

async function readTokenBase(version: FactoryVersion, chainId: SupportedChainId, token: Address) {
  const publicClient = getPublicClient(chainId)
  const factory = getFactoryAddress(version, chainId)
  const info = (await publicClient.readContract({
    address: factory,
    abi: memeTokenFactoryAbi,
    functionName: "tokenInfo",
    args: [token]
  })) as unknown as TokenInfoResult

  const market = info[1]
  
  // First, get basic info and migration status
  const [name, symbol, migrated, targetRaise] = (await publicClient.multicall({
    contracts: [
      { address: token, abi: erc20Abi, functionName: "name" },
      { address: token, abi: erc20Abi, functionName: "symbol" },
      { address: market, abi: bondingCurveMarketAbi, functionName: "migrated" },
      { address: market, abi: bondingCurveMarketAbi, functionName: "targetRaise" }
    ]
  })) as [{ result: string }, { result: string }, { result: boolean }, { result: bigint }]

  const marketBnb = await publicClient.getBalance({ address: market })
  
  // Only call quoteBuy for non-migrated tokens to avoid revert
  let quotePriceBnbPerToken: bigint | undefined
  if (!migrated.result) {
    try {
      const quote = await publicClient.readContract({
        address: market,
        abi: bondingCurveMarketAbi,
        functionName: "quoteBuy",
        args: [10n ** 17n]
      }) as readonly [bigint, bigint]
      
      const tokensOut = quote[0]
      // 计算价格：使用更大的精度避免整数除法结果为0
      // 价格 = (0.1 BNB * 10^18) / tokensOut，结果单位为 wei
      // 为了保留精度，我们返回 (0.1 BNB * 10^36) / tokensOut，这样前端可以除以 10^18 得到正确价格
      if (tokensOut > 0n) {
        const priceScaled = (10n ** 35n) / tokensOut; // 放大 10^18 倍
        quotePriceBnbPerToken = priceScaled;
      } else {
        quotePriceBnbPerToken = undefined;
      }
    } catch (error) {
      console.warn(`[readTokenBase] quoteBuy failed for ${token}:`, error)
      quotePriceBnbPerToken = undefined
    }
  }

  return {
    version,
    chainId,
    factory,
    token,
    market,
    creator: info[2],
    createdAt: asBigInt(info[3]),
    name: name.result,
    symbol: symbol.result,
    description: info[4],
    logo: info[5],
    telegram: info[6],
    twitter: info[7],
    website: info[8],
    templateId: asBigInt(info[9]),
    taxBps: asBigInt(info[10]),
    burnShareBps: asBigInt(info[11]),
    holderShareBps: asBigInt(info[12]),
    liquidityShareBps: asBigInt(info[13]),
    buybackShareBps: asBigInt(info[14]),
    migrated: migrated.result,
    marketBnb,
    targetRaise: targetRaise.result,
    quotePriceBnbPerToken
  }
}

export function createV1Adapter(): FactoryAdapter {
  return {
    version: "v1",
    async listTokens({ chainId, page, pageSize }) {
      const publicClient = getPublicClient(chainId)
      const factory = getFactoryAddress("v1", chainId)
      const length = (await publicClient.readContract({
        address: factory,
        abi: memeTokenFactoryAbi,
        functionName: "allTokensLength"
      })) as bigint

      const total = Number(length)
      const safePage = Math.max(1, page)
      const safePageSize = Math.min(Math.max(1, pageSize), 50)
      const endExclusive = total - (safePage - 1) * safePageSize
      const start = Math.max(0, endExclusive - safePageSize)
      const count = Math.max(0, endExclusive - start)

      if (count === 0) {
        return {
          version: "v1",
          chainId,
          factory,
          total,
          page: safePage,
          pageSize: safePageSize,
          list: []
        }
      }

      const indexes = Array.from({ length: count }, (_, index) => BigInt(start + index))
      const tokenAddresses = (await publicClient.multicall({
        contracts: indexes.map((index) => ({
          address: factory,
          abi: memeTokenFactoryAbi,
          functionName: "allTokens",
          args: [index]
        }))
      })) as unknown as { result: Address }[]

      const list = await Promise.all(
        tokenAddresses
          .map((item) => item.result)
          .reverse()
          .map((token) => readTokenBase("v1", chainId, token))
      )

      return {
        version: "v1",
        chainId,
        factory,
        total,
        page: safePage,
        pageSize: safePageSize,
        list
      }
    },
    async getTokenDetail({ chainId, token }) {
      return readTokenBase("v1", chainId, token)
    }
  }
}

const adapters: Record<FactoryVersion, FactoryAdapter> = {
  v1: createV1Adapter()
}

export function getFactoryAdapter(version: FactoryVersion) {
  return adapters[version]
}
