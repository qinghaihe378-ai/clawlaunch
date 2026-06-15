import { useState, useEffect } from "react"
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseEther, formatEther } from "viem"
import { bsc } from "wagmi/chains"

// PancakeSwap Router V2 ABI（简化版）
const PANCAKE_ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapETHForExactTokens",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "uint256", "name": "amountOutMin", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "swapExactTokensForETH",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amountIn", "type": "uint256" }],
    "name": "getAmountsOut",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// PancakeSwap Router V2 地址 (BSC)
const PANCAKE_ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E"

// 常用代币地址
const TOKENS = {
  BNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
  CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
}

interface SwapState {
  fromToken: string
  toToken: string
  fromAmount: string
  toAmount: string
  slippage: number
}

export default function PancakeSwapInterface() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  const [swapState, setSwapState] = useState<SwapState>({
    fromToken: TOKENS.BNB,
    toToken: TOKENS.USDT,
    fromAmount: "",
    toAmount: "",
    slippage: 0.5,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 执行 Swap
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // 获取报价
  const getQuote = async () => {
    if (!swapState.fromAmount || parseFloat(swapState.fromAmount) <= 0) {
      setSwapState(prev => ({ ...prev, toAmount: "" }))
      return
    }

    try {
      setIsLoading(true)
      // TODO: 调用 PancakeSwap Router 的 getAmountsOut 获取报价
      // 这里需要实现实际的链上查询
      
      // 模拟报价（实际应该从合约获取）
      setTimeout(() => {
        const mockRate = swapState.fromToken === TOKENS.BNB ? 300 : 0.0033
        const estimated = (parseFloat(swapState.fromAmount) * mockRate).toFixed(6)
        setSwapState(prev => ({ ...prev, toAmount: estimated }))
        setIsLoading(false)
      }, 500)
    } catch (err) {
      console.error("Get quote error:", err)
      setIsLoading(false)
    }
  }

  // 执行交换
  const handleSwap = async () => {
    if (!address || !swapState.fromAmount || !swapState.toAmount) {
      setError("请填写完整的交易信息")
      return
    }

    if (chainId !== bsc.id) {
      setError("请切换到 BSC 网络")
      if (switchChain) {
        switchChain({ chainId: bsc.id })
      }
      return
    }

    try {
      setError(null)
      
      // 构建交易参数
      const amountIn = parseEther(swapState.fromAmount)
      const amountOutMin = parseEther(
        (parseFloat(swapState.toAmount) * (1 - swapState.slippage / 100)).toString()
      )
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20分钟后过期

      // 判断是否是 BNB 兑换
      const path = swapState.fromToken === TOKENS.BNB 
        ? [TOKENS.BNB, swapState.toToken]
        : swapState.toToken === TOKENS.BNB
        ? [swapState.fromToken, TOKENS.BNB]
        : [swapState.fromToken, swapState.toToken]

      const functionName = swapState.fromToken === TOKENS.BNB
        ? "swapETHForExactTokens"
        : swapState.toToken === TOKENS.BNB
        ? "swapExactTokensForETH"
        : "swapExactTokensForTokens"

      writeContract({
        address: PANCAKE_ROUTER_ADDRESS,
        abi: PANCAKE_ROUTER_ABI,
        functionName,
        args: [
          swapState.fromToken === TOKENS.BNB ? amountOutMin : amountIn,
          swapState.fromToken === TOKENS.BNB ? amountIn : amountOutMin,
          path,
          address as `0x${string}`,
          BigInt(deadline),
        ].filter(Boolean) as any,
        value: swapState.fromToken === TOKENS.BNB ? amountIn : undefined,
      })
    } catch (err) {
      console.error("Swap error:", err)
      setError("交易失败，请重试")
    }
  }

  // 监听输入变化，获取报价
  useEffect(() => {
    const timer = setTimeout(() => {
      getQuote()
    }, 500)
    return () => clearTimeout(timer)
  }, [swapState.fromAmount, swapState.fromToken, swapState.toToken])

  const getTokenSymbol = (tokenAddress: string) => {
    const symbols: Record<string, string> = {
      [TOKENS.BNB]: "BNB",
      [TOKENS.USDT]: "USDT",
      [TOKENS.BUSD]: "BUSD",
      [TOKENS.CAKE]: "CAKE",
    }
    return symbols[tokenAddress] || "Unknown"
  }

  const isOnBSC = chainId === bsc.id

  return (
    <div className="w-full h-full flex flex-col">
      {/* 网络提示 */}
      {!isOnBSC && (
        <div className="mb-3 p-3 glass-card rounded-xl border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300">请切换到 BSC 网络</span>
            <button
              onClick={() => switchChain?.({ chainId: bsc.id })}
              className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg text-xs font-medium text-white"
            >
              切换
            </button>
          </div>
        </div>
      )}

      {/* Swap 卡片 */}
      <div className="flex-1 glass-card rounded-2xl p-4 glow-effect">
        {/* From */}
        <div className="mb-4">
          <label className="text-xs text-neutral-400 mb-2 block">从</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={swapState.fromAmount}
              onChange={(e) => setSwapState(prev => ({ ...prev, fromAmount: e.target.value }))}
              placeholder="0.0"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={swapState.fromToken}
              onChange={(e) => setSwapState(prev => ({ ...prev, fromToken: e.target.value, fromAmount: "" }))}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              {Object.entries(TOKENS).map(([symbol, address]) => (
                <option key={address} value={address}>{symbol}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 交换箭头 */}
        <div className="flex justify-center my-2">
          <button
            onClick={() => setSwapState(prev => ({
              ...prev,
              fromToken: prev.toToken,
              toToken: prev.fromToken,
              fromAmount: prev.toAmount,
              toAmount: prev.fromAmount,
            }))}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
          >
            ↓
          </button>
        </div>

        {/* To */}
        <div className="mb-4">
          <label className="text-xs text-neutral-400 mb-2 block">到</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={swapState.toAmount}
              readOnly
              placeholder="0.0"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral-500"
            />
            <select
              value={swapState.toToken}
              onChange={(e) => setSwapState(prev => ({ ...prev, toToken: e.target.value, fromAmount: "" }))}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              {Object.entries(TOKENS).map(([symbol, address]) => (
                <option key={address} value={address}>{symbol}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {/* 交易状态 */}
        {isPending && (
          <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400">
            ⏳ 等待确认...
          </div>
        )}

        {isConfirming && (
          <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
            ⏳ 交易中...
          </div>
        )}

        {isConfirmed && (
          <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400">
            ✅ 交易成功！
          </div>
        )}

        {/* Swap 按钮 */}
        <button
          onClick={handleSwap}
          disabled={!address || !swapState.fromAmount || isPending || isConfirming || !isOnBSC}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed glow-effect"
        >
          {!address ? "连接钱包" : isPending ? "确认中..." : isConfirming ? "交易中..." : "交换"}
        </button>
      </div>
    </div>
  )
}