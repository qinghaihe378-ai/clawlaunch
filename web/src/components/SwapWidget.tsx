import { useState, useEffect } from "react"

interface SwapWidgetProps {
  className?: string
}

export default function SwapWidget({ className = "" }: SwapWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

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
    </div>
  )
}