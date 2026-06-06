import type { Response } from "express"

export function serializeData<T>(value: T): T {
  return serializeValue(value) as T
}

function serializeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => serializeValue(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]))
  }
  return value
}

export function ok(res: Response, data: unknown) {
  return res.json({
    code: 200,
    msg: "success",
    data: serializeData(data)
  })
}

export function fail(res: Response, status: number, msg: string, data: unknown = {}) {
  return res.status(status).json({
    code: status,
    msg,
    data: serializeData(data)
  })
}
