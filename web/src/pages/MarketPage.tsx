import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useChainId } from "wagmi"

import { formatBn } from "../lib/format"
import { logoFallbackClass, logoFallbackText, normalizeLogoUrl } from "../lib/logo"
import TradeSidePanel from "../components/TradeSidePanel"

const INITIAL_VISIBLE_COUNT = 20
const LOAD_MORE_STEP = 20

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

type MarketResult = {
  rows: TokenRow[]
  total: number
  visible: number
  hasMore: boolean
  factory?: `0x${string}`
}

type ApiTokenRow = {
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
  templateId: string
  taxBps: string
  burnShareBps: string
  holderShareBps: string
  liquidityShareBps: string
  buybackShareBps: string
  migrated: boolean
  marketBnb: string
  targetRaise: string
  quotePriceBnbPerToken?: string
}

type ApiTokensResponse = {
  code: number
  msg: string
  data: {
    factory?: `0x${string}`
    total: number
    page: number
    pageSize: number
    list: ApiTokenRow[]
  }
}

function apiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (envUrl?.trim()) {
    const url = envUrl.trim().replace(/\/$/, "")
    // 如果 URL 不包含 /api，自动添加
    if (!url.endsWith('/api')) {
      return `${url}/api`
    }
    return url
  }
  if (import.meta.env.DEV) return "http://localhost:3001/api"
  // Production fallback: Use Vercel API routes
  return "/api"
}

// Helper function to safely construct API URLs
function buildApiUrl(path: string) {
  const base = apiBaseUrl()
  // If base is a relative path (starts with /), use window.location.origin
  if (base.startsWith('/')) {
    return `${window.location.origin}${base}${path}`
  }
  // If base is an absolute URL
  if (base.startsWith('http')) {
    return `${base}${path}`
  }
  // Fallback
  console.warn('[API] Invalid base URL, using fallback:', base)
  return `${window.location.origin}/api${path}`
}

function parseBigInt(value: string | number | bigint | undefined): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(value)
  if (!value) return 0n
  return BigInt(value)
}

function mapApiTokenRow(row: ApiTokenRow): TokenRow {
  return {
    token: row.token,
    market: row.market,
    creator: row.creator,
    name: row.name,
    symbol: row.symbol,
    description: row.description,
    logo: row.logo,
    telegram: row.telegram,
    twitter: row.twitter,
    website: row.website,
    templateId: parseBigInt(row.templateId),
    taxBps: parseBigInt(row.taxBps),
    burnShareBps: parseBigInt(row.burnShareBps),
    holderShareBps: parseBigInt(row.holderShareBps),
    liquidityShareBps: parseBigInt(row.liquidityShareBps),
    buybackShareBps: parseBigInt(row.buybackShareBps),
    migrated: row.migrated,
    marketBnb: parseBigInt(row.marketBnb),
    targetRaise: parseBigInt(row.targetRaise),
    // Only set quotePrice if it's a non-zero value
    quotePriceBnbPerToken: (row.quotePriceBnbPerToken && row.quotePriceBnbPerToken !== "0") 
      ? parseBigInt(row.quotePriceBnbPerToken) 
      : undefined
  }
}

export default function MarketPage() {
  const chainId = useChainId()
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<"all" | "sale" | "dex">("all")
  const [raise, setRaise] = useState<"all" | "2" | "3">("all")
  const [template, setTemplate] = useState<"all" | "base" | "tax">("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedToken, setSelectedToken] = useState<TokenRow | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const isSupportedChain = chainId === 56 || chainId === 97

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["market", chainId, visibleCount],
    enabled: isSupportedChain,
    queryFn: async (): Promise<MarketResult> => {
      const url = new URL(buildApiUrl('/tokens'))
      url.searchParams.set("version", "v1")
      url.searchParams.set("chainId", String(chainId))
      url.searchParams.set("page", "1")
      url.searchParams.set("pageSize", String(visibleCount))

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`请求首页接口失败：${response.status}`)
      }

      const payload = (await response.json()) as ApiTokensResponse
      if (payload.code !== 200) {
        throw new Error(payload.msg || "请求首页接口失败")
      }

      return {
        rows: payload.data.list.map(mapApiTokenRow),
        total: payload.data.total,
        visible: payload.data.list.length,
        hasMore: visibleCount < payload.data.total,
        factory: payload.data.factory
      }
    },
    placeholderData: (previousData) => previousData,
    staleTime: 30_000, // 30秒内视为新鲜数据，避免重复请求
    refetchInterval: 60_000, // 60秒自动刷新（原10秒太频繁）
    refetchOnWindowFocus: false, // 关闭窗口聚焦刷新，减少不必要的请求
  })

  const rows = useMemo(() => {
    const list = data?.rows ?? []
    const qq = q.trim().toLowerCase()
    return list.filter((t) => {
      if (status === "dex" && !t.migrated) return false
      if (status === "sale" && t.migrated) return false
      if (raise === "3" && t.targetRaise !== 3000000000000000000n) return false
      if (raise === "2" && t.targetRaise !== 2000000000000000000n) return false
      if (template === "tax" && t.templateId !== 1n) return false
      if (template === "base" && t.templateId !== 0n) return false
      if (!qq) return true
      if (t.token.toLowerCase().includes(qq)) return true
      if (t.market.toLowerCase().includes(qq)) return true
      if (t.name.toLowerCase().includes(qq)) return true
      if (t.symbol.toLowerCase().includes(qq)) return true
      return false
    })
  }, [data, q, raise, status, template])

  function pct(marketBnb: bigint, targetRaise: bigint | undefined, migrated: boolean) {
    if (migrated) return 100 // 已迁移显示100%
    if (!targetRaise || targetRaise <= 0n) return 0
    const p = (marketBnb * 10000n) / targetRaise
    const clipped = p > 10000n ? 10000n : p
    return Number(clipped) / 100
  }

  return (
    <div className="space-y-4">
      <div
        className={`fixed inset-0 z-50 bg-black/60 p-4 ${filterOpen ? "block" : "hidden"}`}
        onClick={() => setFilterOpen(false)}
      >
        <div className="mx-auto max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold gradient-text">筛选</div>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10 transition-all duration-200"
                onClick={() => setFilterOpen(false)}
              >
                关闭
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm font-medium text-neutral-300">搜索</div>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="名称 / Symbol / 地址"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-300">状态</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={
                      status === "all"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setStatus("all")}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    className={
                      status === "sale"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setStatus("sale")}
                  >
                    募集中
                  </button>
                  <button
                    type="button"
                    className={
                      status === "dex"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setStatus("dex")}
                  >
                    已上线
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-300">打满线</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={
                      raise === "all"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setRaise("all")}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    className={
                      raise === "2"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setRaise("2")}
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className={
                      raise === "3"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setRaise("3")}
                  >
                    3
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-300">机制</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={
                      template === "all"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setTemplate("all")}
                  >
                    全部
                  </button>
                  <button
                    type="button"
                    className={
                      template === "base"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setTemplate("base")}
                  >
                    基础
                  </button>
                  <button
                    type="button"
                    className={
                      template === "tax"
                        ? "rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25"
                        : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                    }
                    onClick={() => setTemplate("tax")}
                  >
                    税费
                  </button>
                </div>
              </div>
              <Link
                to="/create"
                className="block rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 text-center text-sm font-medium text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-blue-500/25"
              >
                创建代币
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold gradient-text">✨ 新内盘</div>
              <div className="rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-orange-300 border border-orange-500/30 animate-pulse">
                Live
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10 transition-all duration-200 active:scale-95"
              onClick={() => setFilterOpen(true)}
            >
              ⚙️ 筛选
            </button>
            <button
              className="rounded-lg border border-white/10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 glow-effect flex items-center gap-1.5 active:scale-95"
              onClick={() => refetch()}
            >
              <span className={isLoading ? "animate-spin" : ""}>🔄</span>
              刷新
            </button>
          </div>
        </div>

        {!isSupportedChain && (
          <div className="glass-card rounded-2xl border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
            ⚠️ 当前仅支持 BSC 主网 / 测试网，请切换到 ChainId 56 或 97
          </div>
        )}

        {error && <div className="glass-card rounded-2xl border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">❌ {String(error)}</div>}

        <div 
          className="w-full overflow-hidden rounded-2xl flex justify-center"
          style={{ 
            backgroundColor: 'rgb(10, 11, 14)',
            backgroundImage: `
              radial-gradient(circle at 18% 8%, rgba(0, 240, 255, 0.12), transparent 34%),
              radial-gradient(circle at 82% 14%, rgba(177, 0, 255, 0.16), transparent 36%),
              linear-gradient(135deg, rgb(10, 11, 14) 0%, rgb(17, 19, 26) 48%, rgb(10, 11, 14) 100%)
            `,
          }}
        >
          <div className="space-y-4 p-2 w-full max-w-md">
            {rows.map((t) => {
              const p = pct(t.marketBnb, t.targetRaise, t.migrated)
              return (
                <div
                  key={t.token}
                  className="group w-full transition-all duration-300 ease-out"
                  style={{
                    backgroundColor: 'rgba(20, 22, 30, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    backgroundImage: 'linear-gradient(135deg, rgba(30, 35, 50, 0.9), rgba(20, 22, 30, 0.85))',
                    border: '1px solid rgba(100, 200, 255, 0.15)',
                    borderRadius: '20px',
                    padding: '16px',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(255, 255, 255, 0.05) inset',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'
                    e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.4)'
                    e.currentTarget.style.backgroundImage = 'linear-gradient(135deg, rgba(100, 200, 255, 0.08), rgba(150, 100, 255, 0.08)), rgba(25, 28, 40, 0.95)'
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(100, 200, 255, 0.15), 0 4px 12px rgba(0, 0, 0, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.15)'
                    e.currentTarget.style.backgroundImage = 'linear-gradient(135deg, rgba(30, 35, 50, 0.9), rgba(20, 22, 30, 0.85))'
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(255, 255, 255, 0.05) inset'
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex min-w-0 items-center gap-2 flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedToken(t)
                          setSidePanelOpen(true)
                        }}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                          {normalizeLogoUrl(t.logo) ? (
                            <img src={normalizeLogoUrl(t.logo)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div
                              className={`flex h-full w-full items-center justify-center text-xs font-bold text-white ${logoFallbackClass(
                                t.token
                              )}`}
                            >
                              {logoFallbackText(t.symbol, t.name)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="truncate text-sm font-bold" style={{ color: '#FFFFFF' }}>
                              {t.name}
                            </div>
                            <span className="text-xs shrink-0 font-medium" style={{ color: '#8BCFFF' }}>{t.symbol}</span>
                            {t.templateId === 1n ? (
                              <div className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/30">税</div>
                            ) : null}
                            {t.targetRaise === 6000000000000000000n ? (
                              <div className="rounded bg-neutral-800/50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 border border-neutral-700">6 BNB</div>
                            ) : t.targetRaise === 16500000000000000000n ? (
                              <div className="rounded bg-neutral-800/50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 border border-neutral-700">3 BNB</div>
                            ) : null}
                            {t.migrated ? (
                              <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">DEX</div>
                            ) : (
                              <div className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">Bonding</div>
                            )}
                          </div>
                          <div className="mt-1 truncate text-xs leading-relaxed" style={{ color: 'rgba(180, 200, 230, 0.75)' }}>{t.description || 'No description'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedToken(t)
                          setSidePanelOpen(true)
                        }}
                        className="shrink-0 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all duration-300 ease-out"
                        style={{
                          background: 'linear-gradient(135deg, #6BC9FF, #A78BFA)',
                          boxShadow: '0 4px 16px rgba(107, 201, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                          letterSpacing: '0.05em',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(107, 201, 255, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3)'
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(107, 201, 255, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)'
                          e.currentTarget.style.transform = 'translateY(0) scale(1)'
                        }}
                      >
                        交易
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(100, 200, 255, 0.06)' }}>
                        <div className="text-[10px] mb-1 font-medium tracking-wide uppercase" style={{ color: 'rgba(100, 200, 255, 0.7)' }}>价格</div>
                        <div className="font-semibold text-sm" style={{ color: '#8BCFFF' }}>
                          {t.quotePriceBnbPerToken ? 
                            (() => {
                              // quotePriceBnbPerToken 是放大 10^18 倍的值，需要除以 10^18
                              try {
                                const price = BigInt(t.quotePriceBnbPerToken)
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
                          {formatBn(t.marketBnb)} / {formatBn(t.targetRaise)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div 
                        className="h-2 w-full overflow-hidden rounded-full"
                        style={{
                          backgroundColor: 'rgba(100, 200, 255, 0.08)',
                          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)',
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ 
                            width: `${p}%`,
                            background: 'linear-gradient(90deg, #6BC9FF, #A78BFA)',
                            boxShadow: '0 0 12px rgba(107, 201, 255, 0.4)',
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: 'rgba(150, 180, 220, 0.7)' }}>
                        <div className="truncate font-mono tracking-wide" style={{ color: 'rgba(150, 180, 220, 0.7)' }}>{t.token.slice(0, 6)}...{t.token.slice(-4)}</div>
                        <div className="shrink-0 font-semibold" style={{ color: '#8BCFFF' }}>{p.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden">
                    <div className="min-w-0">
                      <Link to={`/token/${t.token}`} className="block group-hover:translate-x-1 transition-transform duration-200">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                            {normalizeLogoUrl(t.logo) ? (
                              <img src={normalizeLogoUrl(t.logo)} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div
                                className={`flex h-full w-full items-center justify-center text-xs font-bold text-white ${logoFallbackClass(
                                  t.token
                                )}`}
                              >
                                {logoFallbackText(t.symbol, t.name)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="truncate text-sm font-bold text-white">
                                {t.name}
                              </div>
                              <span className="text-xs text-cyan-300 shrink-0">{t.symbol}</span>
                              {t.templateId === 1n ? (
                                <div className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/30">税</div>
                              ) : null}
                              {t.targetRaise === 6000000000000000000n ? (
                                <div className="rounded bg-neutral-800/50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 border border-neutral-700">6 BNB</div>
                              ) : t.targetRaise === 16500000000000000000n ? (
                                <div className="rounded bg-neutral-800/50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300 border border-neutral-700">3 BNB</div>
                              ) : null}
                              {t.migrated ? (
                                <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">DEX</div>
                              ) : (
                                <div className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-500/30">Bonding</div>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-cyan-200/70">{t.description || 'No description'}</div>
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-neutral-800 to-neutral-900">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400 transition-all duration-500"
                                style={{ width: `${p}%` }}
                              />
                            </div>
                            <div className="mt-0.5 flex items-center justify-between text-[10px] text-cyan-300/60">
                              <div className="truncate font-mono">{t.token.slice(0, 6)}...{t.token.slice(-4)}</div>
                              <div className="shrink-0 font-semibold text-cyan-300">{p.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-cyan-300">{t.quotePriceBnbPerToken ? formatBn(t.quotePriceBnbPerToken, 18, 10) : "-"}</div>
                      <div className="text-[10px] text-cyan-300/60">BNB</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-cyan-300">{formatBn(t.marketBnb)}</div>
                      <div className="text-[10px] text-cyan-300/60">/ {formatBn(t.targetRaise)} BNB</div>
                    </div>
                    <div className="flex justify-end">
                      <Link to={`/token/${t.token}`} className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md shadow-blue-500/20">
                        交易
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
            {rows.length === 0 && !isLoading ? (
              <div className="glass-card rounded-2xl px-4 py-12 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <div className="text-sm text-neutral-400">暂无符合条件的代币</div>
              </div>
            ) : null}
          </div>
        </div>
        {data?.hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-6 py-2.5 text-sm font-medium text-neutral-200 hover:from-blue-500/30 hover:to-purple-500/30 disabled:opacity-60 transition-all duration-200 glow-effect flex items-center gap-2"
              disabled={isLoading}
              onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  加载中…
                </>
              ) : (
                <>
                  📦 加载更多（+{LOAD_MORE_STEP}）
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
      
      {/* 侧边交易面板 */}
      {selectedToken && (
        <TradeSidePanel
          token={selectedToken}
          isOpen={sidePanelOpen}
          onClose={() => setSidePanelOpen(false)}
        />
      )}
    </div>
  )
}
