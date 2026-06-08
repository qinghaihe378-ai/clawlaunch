import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS 中间件
app.use('/*', cors())

// Helper: 成功响应
function ok(data: any) {
  return { success: true, data }
}

// Helper: 失败响应
function fail(status: number, message: string) {
  return { success: false, error: message }
}

// /api/health
app.get('/api/health', async (c) => {
  return c.json(ok({ status: 'ok' }))
})

// /api/factories
app.get('/api/factories', async (c) => {
  try {
    // TODO: 导入工厂配置
    return c.json(ok({ list: [] }))
  } catch (error: any) {
    return c.json(fail(500, error.message), 500)
  }
})

// /api/tokens
app.get('/api/tokens', async (c) => {
  try {
    const version = c.req.query('version') || 'v1'
    const chainId = c.req.query('chainId') || '56'
    const page = parseInt(c.req.query('page') || '1')
    const pageSize = parseInt(c.req.query('pageSize') || '20')

    // TODO: 从区块链或缓存获取代币列表
    return c.json(ok({
      rows: [],
      total: 0,
      visible: 0,
      hasMore: false
    }))
  } catch (error: any) {
    return c.json(fail(500, error.message), 500)
  }
})

// /api/tokens/:address
app.get('/api/tokens/:address', async (c) => {
  try {
    const address = c.req.param('address')
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json(fail(400, 'Invalid token address'), 400)
    }

    // TODO: 从区块链获取代币详情
    return c.json(ok({}))
  } catch (error: any) {
    return c.json(fail(500, error.message), 500)
  }
})

export default app
