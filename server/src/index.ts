import { createApp } from "./app.js"
import { runtimeConfig } from "./config.js"
import { connectStores } from "./stores.js"

async function bootstrap() {
  await connectStores()
  const app = createApp()
  app.listen(runtimeConfig.port, () => {
    console.log(`[server] listening on http://localhost:${runtimeConfig.port}`)
  })
}

bootstrap().catch((error) => {
  console.error("[server] bootstrap failed", error)
  process.exit(1)
})
