import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BrowserRouter, Link, Route, Routes } from "react-router-dom"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { bsc } from "wagmi/chains"

import { getPreferredInjectedProvider } from "./embeddedWalletBridge"

const MarketPage = lazy(() => import("./pages/MarketPage"))
const CreateTokenPage = lazy(() => import("./pages/CreateTokenPage"))
const TokenPage = lazy(() => import("./pages/TokenPage"))
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"))

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
  const triedAuto = useRef(false)
  const [injectedReady, setInjectedReady] = useState(false)
  const [noProviderHint, setNoProviderHint] = useState<string | null>(null)

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
              <div className="text-lg font-bold gradient-text">🦞 龙虾</div>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-neutral-200 hover:bg-white/10 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <Link
                to="/"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                📊 行情
              </Link>
              <Link
                to="/create"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                🚀 发行
              </Link>
              <Link
                to="/portfolio"
                className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-100 hover:bg-white/10 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                💼 持仓
              </Link>
              {address ? (
                <button
                  type="button"
                  className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-neutral-200 hover:bg-white/10 transition-all duration-200 text-left"
                  onClick={() => { disconnect(); setMenuOpen(false); }}
                >
                  🔓 断开连接 {shortAddr(address)}
                </button>
              ) : (
                <button
                  type="button"
                  className="glass-card rounded-2xl px-5 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 text-left disabled:opacity-60"
                  disabled={isPending || (!hasInjected && !isInIframe)}
                  onClick={() => {
                    if (!hasInjected && isInIframe) {
                      requestTopOpen()
                      return
                    }
                    connectInjected()
                    setMenuOpen(false)
                  }}
                >
                  {isPending ? "⏳ 连接中…" : "🔗 连接钱包"}
                </button>
              )}
            </div>
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="菜单"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-neutral-200 hover:bg-white/10 transition-all duration-200"
            onClick={() => setMenuOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <Link to="/" className="text-xl font-bold tracking-wide gradient-text hover:opacity-80 transition-opacity">
            🦞 龙虾
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors relative group">
              行情
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/create" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors relative group">
              发行
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/portfolio" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors relative group">
              持仓
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>
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
    </div>
  )
}

function RouteSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="h-9 w-40 animate-pulse rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
      </div>
      <div className="space-y-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="space-y-3">
            <div className="h-20 w-full animate-pulse rounded-xl bg-white/5" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-white/5" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <div className="min-h-[100svh] bg-[radial-gradient(1200px_circle_at_10%_0%,rgba(59,130,246,0.15),transparent_50%),radial-gradient(1000px_circle_at_95%_15%,rgba(168,85,247,0.12),transparent_50%),radial-gradient(800px_circle_at_50%_50%,rgba(236,72,153,0.08),transparent_60%)]">
        <Header />
        <div className="mx-auto max-w-md px-4 py-6 pb-[calc(2.5rem+var(--safe-bottom))]">
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/" element={<MarketPage />} />
              <Route path="/create" element={<CreateTokenPage />} />
              <Route path="/token/:token" element={<TokenPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  )
}
