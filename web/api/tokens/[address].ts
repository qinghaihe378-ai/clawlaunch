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
    const { address } = req.query
    
    if (!address || typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ success: false, error: 'Invalid token address' })
    }

    const { getTokenDetail } = await import('../../../server/src/token-service.js')
    
    const result = await getTokenDetail(address, {
      version: typeof req.query.version === 'string' ? req.query.version : undefined,
      chainId: typeof req.query.chainId === 'string' ? req.query.chainId : undefined
    })

    res.status(200).json({ 
      code: 200,
      msg: "success",
      data: result 
    })
  } catch (error: any) {
    console.error('[Token Detail Error]', error)
    res.status(500).json({ 
      code: 500,
      msg: error.message || 'Internal server error',
      data: {}
    })
  }
}
