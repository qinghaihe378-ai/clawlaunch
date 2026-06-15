import { useState, useEffect } from "react"

interface PancakeShellProps {
  className?: string
}

export default function PancakeShell({ className = "" }: PancakeShellProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeLoaded) {
        setHasError(true)
        setIsLoading(false)
      }
    }, 15000)

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
    <div className={`w-full h-full ${className}`}>
      {/* iframe 容器 */}
      <div className="relative w-full h-full glass-card rounded-2xl overflow-hidden">
        {/* 加载状态 */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-neutral-300 text-sm">加载中...</p>
          </div>
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 backdrop-blur-sm z-10 p-4">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-base font-semibold text-red-400 mb-2">加载失败</h3>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              🔄 重试
            </button>
          </div>
        )}

        {/* PancakeSwap iframe - 完整嵌入 */}
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