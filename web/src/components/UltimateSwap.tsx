import { useState, useEffect } from "react"
import { useAccount, useSwitchChain } from "wagmi"
import { bsc } from "wagmi/chains"

interface UltimateSwapProps {
  className?: string
}

export default function UltimateSwap({ className = "" }: UltimateSwapProps) {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showTips, setShowTips] = useState(true)
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity' | 'farms'>('swap')

  useEffect(() => {
    // 设置超时处理
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        setHasError(true)
        setIsLoading(false)
      }
    }, 15000) // 15秒超时

    return () => clearTimeout(timer)
  }, [iframeLoaded, retryCount])

  const handleIframeLoad = () => {
    setIframeLoaded(true)
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    setIframeLoaded(false)
    setRetryCount(prev => prev + 1)
  }

  const handleSwitchToBSC = () => {
    if (switchChain) {
      switchChain({ chainId: bsc.id })
    }
  }

  const getIframeSrc = () => {
    switch (activeTab) {
      case 'swap':
        return "https://pancakeswap.finance/swap?chain=bsc"
      case 'liquidity':
        return "https://pancakeswap.finance/pools?chain=bsc"
      case 'farms':
        return "https://pancakeswap.finance/farms?chain=bsc"
      default:
        return "https://pancakeswap.finance/swap?chain=bsc"
    }
  }

  const isOnBSC = chainId === bsc.id

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* 网络警告 */}
      {!isOnBSC && address && (
        <div className="mb-4 p-4 glass-card rounded-2xl border-l-4 border-yellow-500">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-400 mb-1">网络不匹配</h3>
              <p className="text-sm text-neutral-300 mb-2">
                当前连接到 {chainId ? `Chain ID: ${chainId}` : '未知网络'}，请切换到 BSC 网络以使用 PancakeSwap。
              </p>
              <button
                onClick={handleSwitchToBSC}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity text-sm"
              >
                🔄 切换到 BSC 网络
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未连接钱包提示 */}
      {!address && (
        <div className="mb-4 p-4 glass-card rounded-2xl border-l-4 border-blue-500">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔗</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-400 mb-1">连接钱包</h3>
              <p className="text-sm text-neutral-300">
                请连接钱包以使用 Swap 功能。点击右上角的"连接钱包"按钮。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="mb-4 glass-card rounded-2xl p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('swap')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'swap'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white glow-effect'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            💧 Swap
          </button>
          <button
            onClick={() => setActiveTab('liquidity')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'liquidity'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white glow-effect'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            💰 流动性
          </button>
          <button
            onClick={() => setActiveTab('farms')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'farms'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white glow-effect'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            🌾 农场
          </button>
        </div>
      </div>

      {/* Swap 容器 */}
      <div className="flex-1 relative glass-card rounded-3xl overflow-hidden glow-effect">
        {/* 加载状态 */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-neutral-300 text-lg font-medium">加载中...</p>
            <p className="text-neutral-500 text-sm mt-2">正在连接 PancakeSwap</p>
          </div>
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-sm z-10 p-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-red-400 mb-2">加载失败</h3>
            <p className="text-neutral-400 text-center mb-6 max-w-md">
              无法加载 PancakeSwap。请检查网络连接后重试。
            </p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity glow-effect"
            >
              🔄 重新加载
            </button>
          </div>
        )}

        {/* PancakeSwap iframe */}
        <iframe
          key={`${retryCount}-${activeTab}`}
          src={getIframeSrc()}
          className={`w-full h-full border-0 transition-opacity duration-500 ${
            iframeLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          title="PancakeSwap"
        />
      </div>

      {/* 使用提示 */}
      {showTips && iframeLoaded && (
        <div className="mt-4 p-4 glass-card rounded-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-neutral-200 mb-2">💡 使用提示</h4>
              <ul className="text-xs text-neutral-400 space-y-1">
                <li>• 确保已连接钱包并切换到 BSC 网络</li>
                <li>• 首次交易需要授权代币合约</li>
                <li>• 注意滑点设置和交易费用</li>
                <li>• 建议在交易前查看价格影响</li>
              </ul>
            </div>
            <button
              onClick={() => setShowTips(false)}
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}