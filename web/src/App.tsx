import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BrowserRouter, Link, Route, Routes } from "react-router-dom"
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi"
import { formatEther, type Address } from "viem"
import { bsc } from "wagmi/chains"

import { getPreferredInjectedProvider } from "./embeddedWalletBridge"

const PROXY_ADDRESS = "0x20CB246EF14e2b0e0a843666C1DDD5443F730f70" as Address

const PROXY_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "inviteCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "totalBNBEarned",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

const SwapPage = lazy(() => import("./pages/SwapPage"))
const PoolPage = lazy(() => import("./pages/PoolPage"))

/** 与 vite base 一致；根路径开发时为 undefined */
function routerBasename(): string | undefined {
  const b = import.meta.env.BASE_URL
  if (!b || b === "/") return undefined
  const s = b.endsWith("/") ? b.slice(0, -1) : b
  return s || undefined
}

function shortAddr(addr?: string) {
  if (!addr) return ""
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function getInjectedProvider(): any {
  return getPreferredInjectedProvider(window)
}

function Header() {
  const { address } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const triedAuto = useRef(false)
  const [injectedReady, setInjectedReady] = useState(false)
  const [noProviderHint, setNoProviderHint] = useState<string | null>(null)

  const { data: inviteCount } = useReadContract({
    address: PROXY_ADDRESS,
    abi: PROXY_ABI,
    functionName: "inviteCount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    }
  })

  const { data: totalBNBEarned } = useReadContract({
    address: PROXY_ADDRESS,
    abi: PROXY_ABI,
    functionName: "totalBNBEarned",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000,
    }
  })

  const isInIframe = (() => {
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  })()

  const hasInjected = injectedReady

  const mobileMenu = menuOpen
    ? createPortal(
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)} role="presentation">
          <div
            className="absolute inset-x-0 top-0 rounded-b-3xl border-b border-white/10 bg-gradient-to-b from-neutral-950 to-neutral-950/95 p-5 glow-effect"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold gradient-text">🦞 claw</div>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200 flex items-center gap-3 w-full text-left"
                onClick={() => {
                  setMenuOpen(false)
                  setShowReferralModal(true)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>邀请返佣</span>
              </button>
              <Link
                to="/swap"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200 flex items-center gap-3"
                onClick={() => {
                  setMenuOpen(false)
                  // Clear hash when clicking Swap
                  if (window.location.hash) {
                    window.history.replaceState(null, '', window.location.pathname)
                  }
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10h14l-4-4"/>
                  <path d="M17 14H3l4 4"/>
                </svg>
                <span>交换</span>
              </Link>
              <Link
                to="/pool"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200 flex items-center gap-3"
                onClick={() => setMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
                </svg>
                <span>流动性</span>
              </Link>
              <a
                href="https://x.com/CLAWDEXAI"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                官方X
              </a>
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  const referralModal = showReferralModal
    ? createPortal(
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReferralModal(false)} role="presentation">
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 to-black p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors"
              onClick={() => setShowReferralModal(false)}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-blue-500">💎</span> 邀请返佣
            </h2>

            {!address ? (
              <div className="text-center py-8">
                <p className="text-neutral-400 text-sm mb-4">请先连接钱包获取您的专属邀请链接</p>
                <button
                  onClick={() => {
                    setShowReferralModal(false)
                    connectInjected()
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  连接钱包
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 邀请链接 */}
                <div>
                  <label className="text-sm font-medium text-neutral-400 mb-2 block">我的邀请链接</label>
                  <div className="flex items-center gap-2 bg-black/50 border border-white/10 p-3 rounded-xl">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}${window.location.pathname}?ref=${address}`}
                      className="bg-transparent text-white text-sm w-full outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?ref=${address}`)
                        alert('复制成功！')
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm font-bold whitespace-nowrap px-3 py-1 bg-blue-500/10 rounded-lg transition-colors"
                    >
                      复制
                    </button>
                  </div>
                </div>

                {/* 收益面板 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-900/5 border border-purple-500/20 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                    <h3 className="text-xs font-medium text-purple-400 mb-1 relative z-10">已邀请人数</h3>
                    <div className="flex items-baseline gap-1 relative z-10">
                      <span className="text-2xl font-bold text-white tracking-tight">{inviteCount !== undefined ? Number(inviteCount) : 0}</span>
                      <span className="text-xs text-purple-300">人</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border border-blue-500/20 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                    <h3 className="text-xs font-medium text-blue-400 mb-1 relative z-10">已赚取佣金</h3>
                    <div className="flex items-baseline gap-1 relative z-10">
                      <span className="text-2xl font-bold text-white tracking-tight">{totalBNBEarned ? parseFloat(formatEther(totalBNBEarned)).toFixed(4) : "0.0000"}</span>
                      <span className="text-xs text-blue-300">BNB</span>
                    </div>
                  </div>
                </div>

                {/* 提现说明 */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-neutral-400 text-center">
                    💡 采用纯链上架构，佣金在被邀请人交易的瞬间已<strong className="text-green-400">自动打入您的钱包</strong>，无需手动提现。
                  </p>
                </div>

                {/* 规则说明 */}
                <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">当前返佣比例</span>
                    <span className="text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded">80%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">有效期限</span>
                    <span className="text-white font-medium">永久有效</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null

  useEffect(() => {
    let cancelled = false
    let tries = 0
    const poll = () => {
      if (cancelled) return
      const p = getInjectedProvider()
      const ok = !!p?.request
      setInjectedReady(ok)
      tries += 1
      if (ok || tries >= 20) return
      window.setTimeout(poll, 400)
    }
    poll()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (address) return
    if (!injectedReady) return
    if (triedAuto.current) return

    const injectedConnector = connectors.find((c) => c.id === "injected")
    if (!injectedConnector) return

    const p = getInjectedProvider()
    if (!p?.request) return

    triedAuto.current = true
    void p
      .request({ method: "eth_accounts" })
      .then((accounts: unknown) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          connect({ connector: injectedConnector, chainId: bsc.id })
        }
      })
      .catch(() => undefined)
  }, [address, connect, connectors, injectedReady])

  useEffect(() => {
    const p = getInjectedProvider()
    if (!p?.on || !p?.removeListener) return

    const injectedConnector = connectors.find((c) => c.id === "injected")
    if (!injectedConnector) return

    const handleAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? (accounts as unknown[]) : []
      const first = typeof list[0] === "string" ? (list[0] as string) : null
      if (!first) {
        disconnect()
        return
      }
      if (!address) {
        connect({ connector: injectedConnector, chainId: bsc.id })
      }
    }

    p.on("accountsChanged", handleAccountsChanged)
    return () => {
      p.removeListener("accountsChanged", handleAccountsChanged)
    }
  }, [address, connect, connectors, disconnect])

  const requestTopOpen = () => {
    const url = window.location.href
    try {
      window.parent?.postMessage({ type: "LONGXIA_OPEN_TOP", url }, "*")
    } catch {
    }
  }

  const connectInjected = () => {
    const injectedConnector = connectors.find((c) => c.id === "injected")
    if (!injectedConnector) return

    const p = getInjectedProvider()
    if (p?.request) {
      setNoProviderHint(null)
      void p
        .request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] })
        .catch(() => undefined)
        .finally(() => connect({ connector: injectedConnector, chainId: bsc.id }))
      return
    }
    if (isInIframe) {
      requestTopOpen()
      return
    }
    setNoProviderHint("未检测到钱包注入，请用钱包 App 的 DApp 浏览器打开本页")
  }

  return (
    <div
      className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-neutral-950/95 to-neutral-950/80 backdrop-blur-xl"
      style={{ paddingTop: isInIframe ? 0 : 'var(--safe-top)' }}
    >
      <div className="mx-auto max-w-md px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-3xl font-bold hover:opacity-80 transition-opacity">
              🦞
            </Link>
            <button
              type="button"
              aria-label="菜单"
              className="p-2 text-neutral-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-white/5"
              onClick={() => setMenuOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {address ? (
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-white/10"
              >
                {shortAddr(address)}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {connectError && (
        <div className="mx-auto max-w-md px-4 pb-2 text-xs text-red-400">
          {String(connectError).includes("ProviderNotFoundError") ? "未检测到钱包注入 Provider（请用钱包 App 的 DApp 浏览器打开，且不要内嵌）" : String(connectError)}
        </div>
      )}
      {noProviderHint && !connectError && (
        <div className="mx-auto max-w-md px-4 pb-2 text-xs text-neutral-400">{noProviderHint}</div>
      )}
      {mobileMenu}
      {referralModal}
    </div>
  )
}

function RouteSkeleton() {
  return null
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <div className="min-h-[100svh] bg-neutral-950">
        <Header />
        <div className="mx-auto max-w-md px-4 py-6 pb-[calc(2.5rem+var(--safe-bottom))]">
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/" element={<SwapPage />} />
              <Route path="/swap" element={<SwapPage />} />
              <Route path="/pool" element={<PoolPage />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  )
}
