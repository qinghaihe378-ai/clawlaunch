import fs from "node:fs"

import { Router, type NextFunction, type Request, type Response } from "express"

import { listSupportedFactories } from "./config.js"
import { fail, ok } from "./response.js"
import { getTokenDetail, listTokens } from "./token-service.js"

export const router = Router()

router.get("/health", async (_req: Request, res: Response) => {
  ok(res, {
    status: "ok"
  })
})

router.get("/factories", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, {
      list: listSupportedFactories()
    })
  } catch (error) {
    next(error)
  }
})

router.get("/tokens", async (req: Request, res: Response, next: NextFunction) => {
  const debugStartedAt = Date.now()
  const debugTraceId = `tokens-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  // #region debug-point A:route-enter
  // Debug code temporarily disabled
  // #endregion
  try {
    const result = await listTokens({
        version: typeof req.query.version === "string" ? req.query.version : undefined,
        chainId: typeof req.query.chainId === "string" ? req.query.chainId : undefined,
        page: typeof req.query.page === "string" ? req.query.page : undefined,
        pageSize: typeof req.query.pageSize === "string" ? req.query.pageSize : undefined,
        traceId: debugTraceId
      })
    // #region debug-point A:route-exit
    // Debug code temporarily disabled
    // #endregion
    ok(res, result)
  } catch (error) {
    next(error)
  }
})

router.get("/tokens/:tokenAddress", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenAddress = Array.isArray(req.params.tokenAddress) ? req.params.tokenAddress[0] : req.params.tokenAddress
    ok(
      res,
      await getTokenDetail(tokenAddress, {
        version: typeof req.query.version === "string" ? req.query.version : undefined,
        chainId: typeof req.query.chainId === "string" ? req.query.chainId : undefined
      })
    )
  } catch (error) {
    next(error)
  }
})

router.use((req: Request, res: Response) => {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`)
})
