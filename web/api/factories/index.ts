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
    const { listSupportedFactories } = await import('../../../server/src/config.js')
    
    res.status(200).json({ 
      success: true, 
      data: { list: listSupportedFactories() } 
    })
  } catch (error: any) {
    console.error('[Factories Error]', error)
    res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}
