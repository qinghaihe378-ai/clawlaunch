import { useState, useEffect } from "react"

interface EnhancedSwapWidgetProps {
  className?: string
}

export default function EnhancedSwapWidget({ className = "" }: EnhancedSwapWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showTips, setShowTips] = useState(true)

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

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
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
          key={retryCount}
          src="https://pancakeswap.finance/swap?chain=bsc"
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