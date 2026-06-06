import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { listTokens } = await import('../../../server/src/token-service.js')
    
    const result = await listTokens({
      version: typeof req.query.version === 'string' ? req.query.version : undefined,
      chainId: typeof req.query.chainId === 'string' ? req.query.chainId : undefined,
      page: typeof req.query.page === 'string' ? req.query.page : undefined,
      pageSize: typeof req.query.pageSize === 'string' ? req.query.pageSize : undefined
    })

    res.status(200).json({ 
      success: true, 
      data: result 
    })
  } catch (error: any) {
    console.error('[List Tokens Error]', error)
    console.error('[List Tokens Error Stack]', error.stack)
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
