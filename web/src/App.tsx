import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { BrowserRouter, Link, Route, Routes } from "react-router-dom"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { bsc } from "wagmi/chains"

import { getPreferredInjectedProvider } from "./embeddedWalletBridge"

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
