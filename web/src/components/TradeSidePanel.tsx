import { useMemo, useState, useEffect } from "react"
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { maxUint256, parseUnits, formatUnits } from "viem"
import { formatBn } from "../lib/format"
import { normalizeLogoUrl, logoFallbackClass, logoFallbackText } from "../lib/logo"
import { bondingCurveMarketAbi, erc20Abi, memeTokenTaxAbi } from "../contracts/abi"

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
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const [bnbIn, setBnbIn] = useState("0.1")
  const [tokensIn, setTokensIn] = useState("")
  const [slippagePct, setSlippagePct] = useState("1")

  const isTax = token.templateId === 1n

  // 计算输入值
  const bnbInWei = useMemo(() => {
    try {
      return parseUnits(bnbIn || "0", 18)
    } catch {
      return 0n
    }
  }, [bnbIn])

  const tokensInWei = useMemo(() => {
    try {
      return parseUnits(tokensIn || "0", 18)
    } catch {
      return 0n
    }
  }, [tokensIn])

  // 获取报价
  const { data: buyQuote } = useReadContract({
    address: token.market,
    abi: bondingCurveMarketAbi,
    functionName: "quoteBuy",
    args: [bnbInWei],
    query: { enabled: activeTab === 'buy' }
  })

  const { data: sellQuote } = useReadContract({
    address: token.market,
    abi: bondingCurveMarketAbi,
    functionName: "quoteSell",
    args: [tokensInWei],
    query: { enabled: activeTab === 'sell' }
  })

  const tokensOut = (buyQuote?.[0] as bigint | undefined) ?? 0n
  const bnbOut = (sellQuote?.[0] as bigint | undefined) ?? 0n

  // 滑点计算
  const slippageBps = useMemo(() => {
    const n = Number(slippagePct || "0")
    if (!Number.isFinite(n) || n <= 0) return 0
    return Math.round(Math.min(n, 50) * 100)
  }, [slippagePct])

  const minTokensOut = useMemo(() => 
    tokensOut > 0n ? (tokensOut * BigInt(10_000 - slippageBps)) / 10_000n : 0n, 
    [tokensOut, slippageBps]
  )
  
  const minBnbOut = useMemo(() => 
    bnbOut > 0n ? (bnbOut * BigInt(10_000 - slippageBps)) / 10_000n : 0n, 
    [bnbOut, slippageBps]
  )

  // 获取余额
  const { data: bnbBalance } = useBalance({
    address,
    query: { enabled: !!address }
  })

  const { data: tokenBalance } = useReadContract({
    address: token.token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address }
  })

  const userBnbBalance = (bnbBalance?.value as bigint | undefined) ?? 0n
  const userTokenBalance = (tokenBalance as bigint | undefined) ?? 0n

  // Approve 检查
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: token.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", token.market],
    query: { enabled: isTax && activeTab === 'sell' && !!address }
  })

  const needsApprove = isTax && address ? ((allowance as bigint | undefined) ?? 0n) < tokensInWei : false

  // 交易执行
  const { writeContract, isPending, error } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ 
    hash: undefined // Will be set after transaction
  })

  const {
    writeContract: writeApprove,
    isPending: isApprovePending
  } = useWriteContract()

  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ 
    hash: undefined
  })

  useEffect(() => {
    if (isApproveSuccess) {
      setTimeout(() => refetchAllowance(), 500)
    }
  }, [isApproveSuccess, refetchAllowance])

  // 分红领取
  const { data: withdrawableDividend } = useReadContract({
    address: token.token,
    abi: memeTokenTaxAbi,
    functionName: "withdrawableDividendOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: isTax && !!address }
  })
  const withdrawable = (withdrawableDividend as bigint | undefined) ?? 0n

  const { writeContract: writeDividend, isPending: isDividendPending } = useWriteContract()

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
        className="fixed right-0 top-0 z-50 h-full w-[360px] bg-[rgb(17,19,26)] shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '2px solid rgba(107, 201, 255, 0.3)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(107, 201, 255, 0.1)',
        }}
      >
        {/* 关闭按钮 */}
        <div 
          className="sticky top-0 z-10 flex items-center justify-between p-4"
          style={{
            backgroundColor: 'rgba(17, 19, 26, 0.95)',
            borderBottom: '1px solid rgba(107, 201, 255, 0.15)',
          }}
        >
          <h2 className="text-lg font-bold text-white">交易</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 代币头部 */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              {normalizeLogoUrl(token.logo) ? (
                <img src={normalizeLogoUrl(token.logo)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-base font-bold text-white ${logoFallbackClass(token.token)}`}>
                  {logoFallbackText(token.symbol, token.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-white truncate">{token.name}</div>
              <div className="text-sm font-medium" style={{ color: '#8BCFFF' }}>{token.symbol}</div>
            </div>
          </div>

          {/* Claim Dividend */}
          {isTax && withdrawable > 0n && (
            <button
              className="w-full rounded-lg bg-yellow-500/20 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-500/30 transition-all"
              disabled={!address || isDividendPending}
              onClick={() =>
                writeDividend({
                  address: token.token,
                  abi: memeTokenTaxAbi,
                  functionName: "claimDividend",
                  args: []
                })
              }
            >
              {isDividendPending ? "⏳ Claiming..." : `💰 Claim ${formatBn(withdrawable)} BNB`}
            </button>
          )}

          {/* Buy/Sell Tabs */}
          <div 
            className="rounded-xl p-1"
            style={{
              backgroundColor: 'rgba(107, 201, 255, 0.08)',
              border: '1px solid rgba(107, 201, 255, 0.15)',
            }}
          >
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('buy')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'buy'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === 'sell'
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Slippage Setting */}
          <div 
            className="flex items-center justify-between rounded-xl p-3"
            style={{
              backgroundColor: 'rgba(107, 201, 255, 0.06)',
              border: '1px solid rgba(107, 201, 255, 0.15)',
            }}
          >
            <span className="text-sm text-neutral-400">Slippage</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={slippagePct}
                onChange={(e) => setSlippagePct(e.target.value)}
                className="w-16 rounded-lg bg-white/5 px-2 py-1 text-right text-sm text-neutral-200 outline-none focus:ring-1 focus:ring-blue-500/50"
                min="0.1"
                max="50"
                step="0.1"
              />
              <span className="text-sm text-neutral-400">%</span>
            </div>
          </div>

          {/* Trade Form */}
          <div className="space-y-3">
            {activeTab === 'buy' ? (
              <>
                {/* You Pay */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-400">You pay</span>
                    <span className="text-xs text-neutral-300">Balance: {formatBn(userBnbBalance, 18, 6)} BNB</span>
                  </div>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl px-4 py-3 pr-20 text-lg outline-none transition-all focus:border-emerald-500/50"
                      value={bnbIn}
                      onChange={(e) => setBnbIn(e.target.value)}
                      placeholder="0.0"
                      type="number"
                      step="any"
                      style={{
                        backgroundColor: 'rgba(17, 19, 26, 0.8)',
                        border: '1px solid rgba(107, 201, 255, 0.2)',
                      }}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-300">
                      BNB
                    </div>
                  </div>
                </div>

                {/* Quick Amount */}
                <div className="grid grid-cols-3 gap-2">
                  {["0.1", "0.5", "1"].map((val) => (
                    <button
                      key={val}
                      onClick={() => setBnbIn(val)}
                      className="rounded-lg px-3 py-2 text-sm transition-all border"
                      style={{
                        backgroundColor: bnbIn === val ? 'rgba(107, 201, 255, 0.15)' : 'rgba(107, 201, 255, 0.06)',
                        borderColor: bnbIn === val ? 'rgba(107, 201, 255, 0.4)' : 'rgba(107, 201, 255, 0.15)',
                        color: bnbIn === val ? '#6BC9FF' : 'rgba(107, 201, 255, 0.7)',
                      }}
                    >
                      {val} BNB
                    </button>
                  ))}
                </div>

                {/* You Get */}
                <div 
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(107, 201, 255, 0.06)',
                    border: '1px solid rgba(107, 201, 255, 0.15)',
                  }}
                >
                  <div className="text-xs text-neutral-400 mb-1">You get</div>
                  <div className="text-lg font-semibold text-neutral-200">
                    {formatBn(tokensOut, 18, 6)}
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60 transition-all shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                    letterSpacing: '0.05em',
                  }}
                  disabled={!address || isPending || isConfirming || bnbInWei === 0n}
                  onClick={() =>
                    writeContract({
                      address: token.market,
                      abi: bondingCurveMarketAbi,
                      functionName: "buy",
                      args: [address!, minTokensOut],
                      value: bnbInWei
                    })
                  }
                >
                  {isPending || isConfirming ? "⏳ Processing..." : "Buy"}
                </button>
              </>
            ) : (
              <>
                {/* You Sell */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-neutral-400">You sell</span>
                    <span className="text-xs text-neutral-300">Balance: {formatBn(userTokenBalance, 18, 6)}</span>
                  </div>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl px-4 py-3 pr-20 text-lg outline-none transition-all focus:border-red-500/50"
                      value={tokensIn}
                      onChange={(e) => setTokensIn(e.target.value)}
                      placeholder="0.0"
                      type="number"
                      step="any"
                      style={{
                        backgroundColor: 'rgba(17, 19, 26, 0.8)',
                        border: '1px solid rgba(107, 201, 255, 0.2)',
                      }}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-300">
                      TOKEN
                    </div>
                  </div>
                </div>

                {/* Percentage Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {["25", "50", "75", "100"].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        const percentage = Number(pct) / 100
                        const amount = userTokenBalance * BigInt(Math.floor(percentage * 10000)) / 10000n
                        setTokensIn(formatUnits(amount, 18))
                      }}
                      className="rounded-lg px-3 py-2 text-sm transition-all border"
                      style={{
                        backgroundColor: 'rgba(107, 201, 255, 0.06)',
                        borderColor: 'rgba(107, 201, 255, 0.15)',
                        color: 'rgba(107, 201, 255, 0.7)',
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {/* You Get */}
                <div 
                  className="p-3 rounded-xl"
                  style={{
                    backgroundColor: 'rgba(107, 201, 255, 0.06)',
                    border: '1px solid rgba(107, 201, 255, 0.15)',
                  }}
                >
                  <div className="text-xs text-neutral-400 mb-1">You get</div>
                  <div className="text-lg font-semibold text-neutral-200">
                    {formatBn(bnbOut, 18, 6)} BNB
                  </div>
                </div>

                {/* Approve or Sell Button */}
                {needsApprove ? (
                  <button
                    className="w-full rounded-xl px-4 py-3.5 text-base font-semibold disabled:opacity-60 transition-all border-2"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderColor: 'rgba(59, 130, 246, 0.4)',
                      color: '#60A5FA',
                    }}
                    disabled={!address || isApprovePending}
                    onClick={() =>
                      writeApprove({
                        address: token.token,
                        abi: erc20Abi,
                        functionName: "approve",
                        args: [token.market, maxUint256]
                      })
                    }
                  >
                    {isApprovePending ? " Approving..." : "Approve"}
                  </button>
                ) : (
                  <button
                    className="w-full rounded-xl px-4 py-3.5 text-base font-semibold text-white disabled:opacity-60 transition-all shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
                      letterSpacing: '0.05em',
                    }}
                    disabled={!address || isPending || isConfirming || tokensInWei === 0n}
                    onClick={() =>
                      writeContract({
                        address: token.market,
                        abi: bondingCurveMarketAbi,
                        functionName: "sell",
                        args: [tokensInWei, minBnbOut, address!]
                      })
                    }
                  >
                    {isPending || isConfirming ? "⏳ Processing..." : "Sell"}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="p-3 rounded-lg text-xs"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#FCA5A5',
              }}
            >
              ❌ {error.message}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
