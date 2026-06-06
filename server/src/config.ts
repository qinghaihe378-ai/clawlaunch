import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "node:fs"

import dotenv from "dotenv"
import { createPublicClient, http, type Address, type PublicClient } from "viem"
import { bsc, bscTestnet } from "viem/chains"

const currentDir = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(currentDir, "../../.env") })
dotenv.config({ path: path.resolve(currentDir, "../.env"), override: false })

// Load deployment files manually to avoid import assertion issues
const bscDeploymentPath = path.resolve(currentDir, "../../contracts/deployments/bsc.json")
const bscTestnetDeploymentPath = path.resolve(currentDir, "../../contracts/deployments/bscTestnet.json")

const bscDeployment = JSON.parse(fs.readFileSync(bscDeploymentPath, "utf-8"))
const bscTestnetDeployment = JSON.parse(fs.readFileSync(bscTestnetDeploymentPath, "utf-8"))

export type SupportedChainId = 56 | 97
export type FactoryVersion = "v1"

type FactoryAddressBook = Record<SupportedChainId, Address | undefined>

const mainnetRpcUrl = process.env.BNB_RPC_URL?.trim() || "https://bsc-dataseed.bnbchain.org"
const testnetRpcUrl =
  process.env.BNB_TESTNET_RPC_URL?.trim() || "https://data-seed-prebsc-1-s1.bnbchain.org:8545"

const factoryAddresses: Record<FactoryVersion, FactoryAddressBook> = {
  v1: {
    56: (process.env.FACTORY_V1_ADDRESS_BSC?.trim() || bscDeployment.factory) as Address | undefined,
    97: (process.env.FACTORY_V1_ADDRESS_BSC_TESTNET?.trim() || bscTestnetDeployment.factory) as Address | undefined
  }
}

const publicClients = new Map<SupportedChainId, PublicClient>()

export const runtimeConfig = {
  port: Number(process.env.PORT || 3001),
  defaultFactoryVersion: (process.env.API_FACTORY_VERSION?.trim() || "v1") as FactoryVersion,
  mongoUri: process.env.MONGODB_URI?.trim() || "",
  mongoDbName: process.env.MONGODB_DB_NAME?.trim() || "longxia",
  redisUrl: process.env.REDIS_URL?.trim() || "",
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 15)
}

export function resolveFactoryVersion(input?: string): FactoryVersion {
  const version = (input?.trim() || runtimeConfig.defaultFactoryVersion) as FactoryVersion
  if (!(version in factoryAddresses)) {
    throw new Error(`Unsupported factory version: ${input}`)
  }
  return version
}

export function resolveChainId(input?: string | number): SupportedChainId {
  const chainId = typeof input === "number" ? input : Number(input || 56)
  if (chainId !== 56 && chainId !== 97) {
    throw new Error(`Unsupported chainId: ${String(input)}`)
  }
  return chainId
}

export function getFactoryAddress(version: FactoryVersion, chainId: SupportedChainId): Address {
  const address = factoryAddresses[version][chainId]
  if (!address) {
    throw new Error(`Factory address not configured for version=${version}, chainId=${chainId}`)
  }
  return address
}

export function getPublicClient(chainId: SupportedChainId): PublicClient {
  const cached = publicClients.get(chainId)
  if (cached) return cached

  const chain = chainId === 56 ? bsc : bscTestnet
  const rpcUrl = chainId === 56 ? mainnetRpcUrl : testnetRpcUrl
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl)
  })

  publicClients.set(chainId, client)
  return client
}

export function listSupportedFactories() {
  return Object.entries(factoryAddresses).map(([version, addresses]) => ({
    version,
    chains: Object.entries(addresses)
      .filter(([, address]) => !!address)
      .map(([chainId, address]) => ({
        chainId: Number(chainId),
        address
      }))
  }))
}
