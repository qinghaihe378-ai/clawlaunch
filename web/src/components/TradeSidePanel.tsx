import { Link } from "react-router-dom"
import { formatBn } from "../lib/format"
import { normalizeLogoUrl, logoFallbackClass, logoFallbackText } from "../lib/logo"

type TokenRow = {
  token: `0x${string}`
  market: `0x${string}`
  creator: `0x${string}`
  name: string
  symbol: string
  description: string
  logo: string
  telegram: string
  twitter: string
  website: string
  templateId: bigint
  taxBps: bigint
  burnShareBps: bigint
  holderShareBps: bigint
  liquidityShareBps: bigint
  buybackShareBps: bigint
  migrated: boolean
  marketBnb: bigint
  targetRaise: bigint
  quotePriceBnbPerToken?: bigint
}

type SidePanelProps = {
  token: TokenRow
  onClose: () => void
  isOpen: boolean
}

export default function TradeSidePanel({ token, onClose, isOpen }: SidePanelProps) {
  if (!isOpen) return null

  const progress = token.targetRaise > 0n 
    ? Math.min(100, Number((token.marketBnb * 10000n) / token.targetRaise) / 100)
    : 0

  return (
    <>
      {/* 遮罩层 */}
      <div 
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* 侧边面板 */}
      <aside 
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[rgb(17,19,26)] shadow-2xl transform transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid rgba(100, 200, 255, 0.15)',
        }}
      >
        {/* 关闭按钮 */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">代币详情</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
          {/* 代币头部 */}
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              {normalizeLogoUrl(token.logo) ? (
                <img src={normalizeLogoUrl(token.logo)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-lg font-bold text-white ${logoFallbackClass(token.token)}`}>
                  {logoFallbackText(token.symbol, token.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold text-white truncate">{token.name}</div>
              <div className="text-sm font-medium" style={{ color: '#8BCFFF' }}>{token.symbol}</div>
            </div>
          </div>

          {/* 价格和募资 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(100, 200, 255, 0.06)' }}>
              <div className="text-[10px] mb-1 font-medium tracking-wide uppercase" style={{ color: 'rgba(100, 200, 255, 0.7)' }}>价格</div>
              <div className="font-semibold text-sm" style={{ color: '#8BCFFF' }}>
                {token.quotePriceBnbPerToken ? 
                  (() => {
                    try {
                      const price = BigInt(token.quotePriceBnbPerToken)
                      const integerPart = price / BigInt(1e18)
                      const decimalPart = price % BigInt(1e18)
                      const decimalStr = decimalPart.toString().padStart(18, '0').slice(0, 10)
                      return `${integerPart}.${decimalStr}`
                    } catch {
                      return '-'
                    }
                  })()
                : "-"}
              </div>
            </div>
            <div className="p-3 rounded-xl text-right" style={{ backgroundColor: 'rgba(100, 200, 255, 0.06)' }}>
              <div className="text-[10px] mb-1 font-medium tracking-wide uppercase" style={{ color: 'rgba(100, 200, 255, 0.7)' }}>募资</div>
              <div className="font-semibold text-sm" style={{ color: '#8BCFFF' }}>
                {formatBn(token.marketBnb)} / {formatBn(token.targetRaise)}
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(100, 200, 255, 0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #6BC9FF, #A78BFA)',
                  boxShadow: '0 0 12px rgba(107, 201, 255, 0.4)',
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: 'rgba(150, 180, 220, 0.7)' }}>
              <div className="truncate font-mono tracking-wide">{token.token.slice(0, 6)}...{token.token.slice(-4)}</div>
              <div className="shrink-0 font-semibold" style={{ color: '#8BCFFF' }}>{progress.toFixed(1)}%</div>
            </div>
          </div>

          {/* 描述 */}
          {token.description && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
              <div className="text-xs leading-relaxed" style={{ color: 'rgba(180, 200, 230, 0.75)' }}>
                {token.description}
              </div>
            </div>
          )}

          {/* 社交链接 */}
          {(token.telegram || token.twitter || token.website) && (
            <div className="flex gap-2">
              {token.website && (
                <a href={token.website} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center text-xs text-neutral-300">
                  🌐 Website
                </a>
              )}
              {token.telegram && (
                <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center text-xs text-neutral-300">
                  💬 Telegram
                </a>
              )}
              {token.twitter && (
                <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-center text-xs text-neutral-300">
                  🐦 Twitter
                </a>
              )}
            </div>
          )}

          {/* 前往交易页面按钮 */}
          <Link
            to={`/token/${token.token}`}
            onClick={onClose}
            className="block w-full py-3 px-4 rounded-xl text-center text-sm font-semibold text-white transition-all duration-300 ease-out"
            style={{
              background: 'linear-gradient(135deg, #6BC9FF, #A78BFA)',
              boxShadow: '0 4px 16px rgba(107, 201, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            前往交易页面 →
          </Link>
        </div>
      </aside>
    </>
  )
}
