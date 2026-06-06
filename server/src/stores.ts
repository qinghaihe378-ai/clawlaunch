import { MongoClient } from "mongodb"
import { createClient, type RedisClientType } from "redis"

import { runtimeConfig } from "./config.js"

let mongoClient: MongoClient | null = null
let redisClient: RedisClientType | null = null

export async function connectStores() {
  if (runtimeConfig.mongoUri && !mongoClient) {
    mongoClient = new MongoClient(runtimeConfig.mongoUri)
    await mongoClient.connect()
  }

  if (runtimeConfig.redisUrl && !redisClient) {
    redisClient = createClient({ url: runtimeConfig.redisUrl })
    redisClient.on("error", (error: unknown) => {
      console.error("[redis]", error)
    })
    await redisClient.connect()
  }
}

export function getMongoCollection<T extends Record<string, unknown>>(name: string) {
  if (!mongoClient) return null
  return mongoClient.db(runtimeConfig.mongoDbName).collection<T>(name)
}

export function getRedisClient() {
  return redisClient
}
