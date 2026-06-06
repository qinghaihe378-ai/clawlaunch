import cors from "cors"
import express, { type NextFunction, type Request, type Response } from "express"

import { fail } from "./response.js"
import { router } from "./routes.js"

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use("/api", router)

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[server]", error)
    fail(res, 500, message)
  })

  return app
}
