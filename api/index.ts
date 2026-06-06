import type { VercelRequest, VercelResponse } from '@vercel/node'

// Helper: 成功响应
function ok(res: VercelResponse, data: any) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.status(200).json({ success: true, data })
}

// Helper: 失败响应
function fail(res: VercelResponse, status: number, message: string) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(status).json({ success: false, error: message })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 处理 CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    // /api/health
    if (pathname === '/api/health' || pathname === '/health') {
      return ok(res, { status: 'ok' })
    }

    // /api/factories
    if (pathname === '/api/factories' || pathname === '/factories') {
      const { listSupportedFactories } = await import('../server/src/config.js')
      return ok(res, { list: listSupportedFactories() })
    }

    // /api/tokens
    if (pathname === '/api/tokens' || pathname === '/tokens') {
      const { listTokens } = await import('../server/src/token-service.js')
      const result = await listTokens({
        version: typeof req.query.version === 'string' ? req.query.version : undefined,
        chainId: typeof req.query.chainId === 'string' ? req.query.chainId : undefined,
        page: typeof req.query.page === 'string' ? req.query.page : undefined,
        pageSize: typeof req.query.pageSize === 'string' ? req.query.pageSize : undefined
      })
      return ok(res, result)
    }

    // /api/tokens/:tokenAddress
    const tokenMatch = pathname.match(/^\/api\/tokens\/(0x[a-fA-F0-9]{40})$/) || 
                       pathname.match(/^\/tokens\/(0x[a-fA-F0-9]{40})$/)
    if (tokenMatch) {
      const { getTokenDetail } = await import('../server/src/token-service.js')
      const tokenAddress = tokenMatch[1]
      const result = await getTokenDetail(tokenAddress, {
        version: typeof req.query.version === 'string' ? req.query.version : undefined,
        chainId: typeof req.query.chainId === 'string' ? req.query.chainId : undefined
      })
      return ok(res, result)
    }

    // 404
    return fail(res, 404, `Route not found: ${req.method} ${pathname}`)
  } catch (error: any) {
    console.error('[Vercel API Error]', error)
    return fail(res, 500, error.message || 'Internal server error')
  }
}
