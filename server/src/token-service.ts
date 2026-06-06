import type { Address } from "viem"

import { getFactoryAdapter } from "./factory-adapters.js"
import { resolveChainId, resolveFactoryVersion, runtimeConfig } from "./config.js"
import { serializeData } from "./response.js"
import { getMongoCollection, getRedisClient } from "./stores.js"

type ListTokenQuery = {
  version?: string
  chainId?: string
  page?: string
  pageSize?: string
}

type TokenDetailQuery = {
  version?: string
  chainId?: string
}

const TOKEN_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

export async function listTokens(query: ListTokenQuery) {
  const version = resolveFactoryVersion(query.version)
  const chainId = resolveChainId(query.chainId)
  const page = Math.max(1, Number(query.page || 1))
  const pageSize = Math.min(Math.max(1, Number(query.pageSize || 20)), 50)
  const cacheKey = `tokens:list:${version}:${chainId}:${page}:${pageSize}`
  const redis = getRedisClient()

  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
  }

  const adapter = getFactoryAdapter(version)
  const result = await adapter.listTokens({ chainId, page, pageSize })
  const serialized = serializeData(result)

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(serialized), { EX: runtimeConfig.cacheTtlSeconds })
  }

  const collection = getMongoCollection<Record<string, unknown>>("token_snapshots")
  if (collection && Array.isArray(serialized.list) && serialized.list.length > 0) {
    await collection.bulkWrite(
      serialized.list.map((item) => ({
        updateOne: {
          filter: { key: `${version}:${chainId}:${String(item.token)}` },
          update: {
            $set: {
              key: `${version}:${chainId}:${String(item.token)}`,
              version,
              chainId,
              token: item.token,
              payload: item,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      }))
    )
  }

  return serialized
}

export async function getTokenDetail(tokenAddress: string, query: TokenDetailQuery) {
  if (!TOKEN_ADDRESS_RE.test(tokenAddress)) {
    throw new Error("Invalid token address")
  }

  const version = resolveFactoryVersion(query.version)
  const chainId = resolveChainId(query.chainId)
  const cacheKey = `tokens:detail:${version}:${chainId}:${tokenAddress.toLowerCase()}`
  const redis = getRedisClient()

  if (redis) {
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)
  }

  const adapter = getFactoryAdapter(version)
  const result = await adapter.getTokenDetail({
    chainId,
    token: tokenAddress as Address
  })
  const serialized = serializeData(result)

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(serialized), { EX: runtimeConfig.cacheTtlSeconds })
  }

  const collection = getMongoCollection<Record<string, unknown>>("token_details")
  if (collection) {
    await collection.updateOne(
      { key: `${version}:${chainId}:${tokenAddress.toLowerCase()}` },
      {
        $set: {
          key: `${version}:${chainId}:${tokenAddress.toLowerCase()}`,
          version,
          chainId,
          token: tokenAddress.toLowerCase(),
          payload: serialized,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
  }

  return serialized
}
