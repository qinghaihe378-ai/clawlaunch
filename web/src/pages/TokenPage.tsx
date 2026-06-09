import { useMemo, useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract
} from "wagmi"
import { maxUint256, parseUnits } from "viem"

import { getFactoryAddress } from "../contracts/addresses"
import { bondingCurveMarketAbi, erc20Abi, memeTokenFactoryAbi, memeTokenTaxAbi } from "../contracts/abi"
import { formatBn } from "../lib/format"
import { logoFallbackClass, logoFallbackText, normalizeLogoUrl } from "../lib/logo"

type TradePanelProps = {
  token: `0x${string}`
  market: `0x${string}`
  isTax: boolean
  disabled: boolean
}

function isAddr(v?: string): v is `0x${string}` {
  return !!v && /^0x[0-9a-fA-F]{40}$/.test(v)
}

function asBigInt(v: unknown): bigint {
  if (typeof v === "bigint") return v
  if (typeof v === "number") return BigInt(v)
  return BigInt(v as any)
}

export default function TokenPage() {
  const { token: tokenParam } = useParams()
  const token = isAddr(tokenParam) ? tokenParam : undefined
  const chainId = useChainId()
  const factory = getFactoryAddress(chainId)
  const publicClient = usePublicClient()
  const { address } = useAccount()
  
  // 验证状态
  const [verifying, setVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [verifyMessage, setVerifyMessage] = useState('')

  const { data: info, refetch } = useQuery({
    queryKey: ["tokenInfo", chainId, token],
    enabled: !!token && !!publicClient && !!factory,
    queryFn: async () => {
      if (!publicClient) throw new Error("No public client")
      if (!factory) throw new Error("Missing factory address")
      const r = (await publicClient.readContract({
        address: factory,
        abi: memeTokenFactoryAbi,
        functionName: "tokenInfo",
        args: [token!]
      })) as unknown as readonly [
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        bigint,
        string,
        string,
        string,
        string,
        string,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint
      ]
      const market = r[1]
      const [name, symbol, migrated, targetRaise] = (await publicClient.multicall({
        contracts: [
          { address: token!, abi: erc20Abi, functionName: "name" as const },
          { address: token!, abi: erc20Abi, functionName: "symbol" as const },
          { address: market, abi: bondingCurveMarketAbi, functionName: "migrated" as const },
          { address: market, abi: bondingCurveMarketAbi, functionName: "targetRaise" as const }
        ]
      })) as unknown as [{ result: string }, { result: string }, { result: boolean }, { result: bigint }]
      const marketBnb = await publicClient.getBalance({ address: market })

      return {
        token: token!,
        market,
        creator: r[2],
        description: r[4],
        logo: r[5],
        telegram: r[6],
        twitter: r[7],
        website: r[8],
        templateId: asBigInt(r[9]),
        taxBps: asBigInt(r[10]),
        burnShareBps: asBigInt(r[11]),
        holderShareBps: asBigInt(r[12]),
        liquidityShareBps: asBigInt(r[13]),
        buybackShareBps: asBigInt(r[14]),
        name: name.result,
        symbol: symbol.result,
        migrated: migrated.result,
        targetRaise: targetRaise.result,
        marketBnb
      }
    },
    refetchInterval: 5000
  })

  useWatchContractEvent({
    address: info?.market,
    abi: bondingCurveMarketAbi,
    eventName: "Buy",
    enabled: !!info?.market,
    onLogs: () => void refetch()
  })
  useWatchContractEvent({
    address: info?.market,
    abi: bondingCurveMarketAbi,
    eventName: "Sell",
    enabled: !!info?.market,
    onLogs: () => void refetch()
  })
  useWatchContractEvent({
    address: info?.market,
    abi: bondingCurveMarketAbi,
    eventName: "Migrated",
    enabled: !!info?.market,
    onLogs: () => void refetch()
  })

  // 验证合约函数
  const handleVerify = async () => {
    if (!info) return
    
    setVerifying(true)
    setVerifyStatus('pending')
    setVerifyMessage('Submitting verification...')
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://clawlaunch.qinghaihe378.workers.dev'
      const response = await fetch(
        `${apiBaseUrl}/api/verify-token?address=${info.token}&templateId=${info.templateId}&chainId=${chainId}`
      )
      const data = await response.json()
      
      if (data.code === 0) {
        setVerifyStatus('success')
        setVerifyMessage(`Verification submitted! Check status in a few minutes.`)
      } else {
        setVerifyStatus('error')
        setVerifyMessage(data.message || 'Verification failed')
      }
    } catch (error: any) {
      console.error('Verification error:', error)
      setVerifyStatus('error')
      setVerifyMessage(error.message || 'Network error')
    } finally {
      setVerifying(false)
    }
  }

  if (!token) return <div className="glass-card rounded-2xl border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">Invalid address</div>
  if (!factory) {
    return (
      <div className="glass-card rounded-2xl border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
        Only BSC mainnet is supported. Please switch to BSC (ChainId 56)
      </div>
    )
  }
  if (!info) return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-8 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-48 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
            <div className="h-4 w-32 rounded-lg bg-white/5" />
          </div>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-5 w-24 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
          <div className="h-2 w-full rounded-full bg-white/5" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  )

  const targetRaiseLabel =
    info.targetRaise === 2000000000000000000n ? "2" : info.targetRaise === 3000000000000000000n ? "3" : undefined
  const progressPct =
    info.migrated ? 100 : // 已迁移显示100%
    info.targetRaise > 0n
      ? Number(((info.marketBnb * 10000n) / info.targetRaise > 10000n ? 10000n : (info.marketBnb * 10000n) / info.targetRaise)) /
        100
      : 0

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {/* 代币信息卡片 - 简化版 */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              {normalizeLogoUrl(info.logo) ? (
                <img src={normalizeLogoUrl(info.logo)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center text-sm font-bold text-white ${logoFallbackClass(
                    token
                  )}`}
                >
                  {logoFallbackText(info.symbol, info.name)}
                </div>
              )}
            </div>
            
            {/* 基本信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold truncate">{info.name}</h1>
                <span className="text-sm text-neutral-400 shrink-0">({info.symbol})</span>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {info.templateId === 1n ? (
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">Tax</span>
                ) : null}
                {info.migrated ? (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">DEX</span>
                ) : (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">Bonding</span>
                )}
                <span 
                  className="rounded bg-white/5 px-2 py-0.5 text-xs font-mono text-neutral-400 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(info.token)
                      .then(() => alert('Contract address copied!'))
                      .catch(() => alert('Failed to copy'))
                  }}
                  title="Click to copy"
                >
                  {info.token.slice(0, 6)}...{info.token.slice(-4)}
                </span>
                
                {/* 验证按钮 */}
                {!info.migrated && (
                  <button
                    onClick={handleVerify}
                    disabled={verifying || verifyStatus === 'success'}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-all duration-200 ${
                      verifyStatus === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                        : verifyStatus === 'error'
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50'
                    }`}
                    title="Verify contract on BSCScan"
                  >
                    {verifying ? 'Verifying...' : verifyStatus === 'success' ? '✓ Verified' : 'Verify'}
                  </button>
                )}
              </div>
              
              {/* 验证状态消息 */}
              {verifyMessage && (
                <div className={`text-xs mt-1 ${
                  verifyStatus === 'success' ? 'text-emerald-400' :
                  verifyStatus === 'error' ? 'text-red-400' :
                  'text-neutral-400'
                }`}>
                  {verifyMessage}
                </div>
              )}
              
              {/* 描述 */}
              {info.description && (
                <div className="text-sm text-neutral-400 line-clamp-2">{info.description}</div>
              )}
              
              {/* 社交链接 */}
              {(info.telegram || info.twitter || info.website) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {info.telegram && (
                    <a href={info.telegram} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:text-sky-300">
                      Telegram
                    </a>
                  )}
                  {info.twitter && (
                    <a href={info.twitter} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      Twitter
                    </a>
                  )}
                  {info.website && (
                    <a href={info.website} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300">
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* Funding Progress */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-neutral-400">Progress</span>
              <span className="font-medium">
                {formatBn(info.marketBnb)} / {formatBn(info.targetRaise)} BNB
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-1.5 text-xs text-neutral-500 text-right">
              {progressPct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Trade Panel */}
      <div>
        <TradePanel
          token={info.token}
          market={info.market}
          isTax={info.templateId === 1n}
          disabled={!address || info.migrated}
        />
      </div>
    </div>
  )
}

function TradePanel(props: TradePanelProps) {
  const { address } = useAccount()
  const [bnbIn, setBnbIn] = useState("0.1")
  const [tokensIn, setTokensIn] = useState("1000000")
  const [slippagePct, setSlippagePct] = useState("1")

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

  const { data: buyQuote } = useReadContract({
    address: props.market,
    abi: bondingCurveMarketAbi,
    functionName: "quoteBuy",
    args: [bnbInWei]
  })

  const { data: sellQuote } = useReadContract({
    address: props.market,
    abi: bondingCurveMarketAbi,
    functionName: "quoteSell",
    args: [tokensInWei]
  })

  const tokensOut = (buyQuote?.[0] as bigint | undefined) ?? 0n
  const buyFee = (buyQuote?.[1] as bigint | undefined) ?? 0n
  const bnbOut = (sellQuote?.[0] as bigint | undefined) ?? 0n
  const sellFee = (sellQuote?.[1] as bigint | undefined) ?? 0n

  const slippageBps = useMemo(() => {
    const n = Number(slippagePct || "0")
    if (!Number.isFinite(n) || n <= 0) return 0
    const clamped = Math.min(n, 50)
    return Math.round(clamped * 100)
  }, [slippagePct])

  const minTokensOut = useMemo(() => (tokensOut * BigInt(10_000 - slippageBps)) / 10_000n, [tokensOut, slippageBps])
  const minBnbOut = useMemo(() => (bnbOut * BigInt(10_000 - slippageBps)) / 10_000n, [bnbOut, slippageBps])

  const { data: withdrawableDividend } = useReadContract({
    address: props.token,
    abi: memeTokenTaxAbi,
    functionName: "withdrawableDividendOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: props.isTax && !!address }
  })
  const withdrawable = (withdrawableDividend as bigint | undefined) ?? 0n

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: props.token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", props.market]
  })

  const needsApprove = address ? ((allowance as bigint | undefined) ?? 0n) < tokensInWei : false

  // 获取 BNB 余额和代币余额
  const { data: bnbBalance } = useBalance({
    address,
    query: { enabled: !!address }
  })
  
  const { data: tokenBalance } = useReadContract({
    address: props.token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address }
  })
  
  const userBnbBalance = (bnbBalance?.value as bigint | undefined) ?? 0n
  const userTokenBalance = (tokenBalance as bigint | undefined) ?? 0n

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash })

  const {
    writeContract: writeApprove,
    data: approveTxHash,
    isPending: isApprovePending,
    error: approveError
  } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ 
    hash: approveTxHash
  })

  // 监听 approve 交易完成后重新查询 allowance
  useEffect(() => {
    if (isApproveSuccess) {
      // 延迟一下确保链上状态已更新
      const timer = setTimeout(() => {
        void refetchAllowance()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isApproveSuccess, refetchAllowance])

  const {
    writeContract: writeDividend,
    data: dividendHash,
    isPending: isDividendPending,
    error: dividendError
  } = useWriteContract()
  const { isLoading: isDividendConfirming } = useWaitForTransactionReceipt({ hash: dividendHash })

  return (
    <div className="glass-card rounded-2xl p-4">
      {/* Slippage */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-neutral-400">Slippage</label>
          <span className="text-xs text-neutral-300">{slippagePct}%</span>
        </div>
        <div className="flex gap-1.5">
          {["0.5", "1", "2", "5"].map((val) => (
            <button
              key={val}
              onClick={() => setSlippagePct(val)}
              className={`flex-1 rounded px-2 py-1.5 text-xs transition-all ${
                slippagePct === val
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-neutral-400 hover:bg-white/10"
              }`}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* Claim Dividend */}
      {props.isTax && withdrawable > 0n && (
        <button
          className="w-full mb-3 rounded bg-yellow-500/20 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-500/30 transition-all"
          disabled={!address || isDividendPending || isDividendConfirming}
          onClick={() =>
            writeDividend({
              address: props.token,
              abi: memeTokenTaxAbi,
              functionName: "claimDividend",
              args: []
            })
          }
        >
          {isDividendPending || isDividendConfirming ? "" : `💰 Claim ${formatBn(withdrawable)} BNB`}
        </button>
      )}

      {/* Buy & Sell Tabs */}
      <div className="mb-4">
        <div className="flex gap-2">
          {/* Buy Section */}
          <div className="flex-1 glass-card rounded-xl p-3 border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-400">Buy</span>
              <span className="text-[10px] text-neutral-500">Balance: {formatBn(userBnbBalance, 18, 6)} BNB</span>
            </div>
            <input
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500/50 mb-2"
              value={bnbIn}
              onChange={(e) => setBnbIn(e.target.value)}
              placeholder="BNB amount"
            />
            <button
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-2 text-sm font-medium text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 transition-all shadow-lg shadow-emerald-500/20"
              disabled={props.disabled || isPending || isConfirming || bnbInWei === 0n}
              onClick={() =>
                writeContract({
                  address: props.market,
                  abi: bondingCurveMarketAbi,
                  functionName: "buy",
                  args: [address!, minTokensOut],
                  value: bnbInWei
                })
              }
            >
              {isPending || isConfirming ? "⏳" : "Buy"}
            </button>
          </div>

          {/* Sell Section */}
          <div className="flex-1 glass-card rounded-xl p-3 border-red-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-400">Sell</span>
              <span className="text-[10px] text-neutral-500">Balance: {formatBn(userTokenBalance, 18, 6)}</span>
            </div>
            <input
              className="w-full rounded-lg border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500/50 mb-2"
              value={tokensIn}
              onChange={(e) => setTokensIn(e.target.value)}
              placeholder="Token amount"
            />
            {needsApprove ? (
              <button
                className="w-full rounded-lg border border-blue-500 bg-blue-500/10 px-3 py-2 text-sm text-blue-300 hover:bg-blue-500/20 disabled:opacity-60 transition-all"
                disabled={props.disabled || isApprovePending || isApproveConfirming}
                onClick={() =>
                  writeApprove({
                    address: props.token,
                    abi: erc20Abi,
                    functionName: "approve",
                    args: [props.market, maxUint256]
                  })
                }
              >
                {isApprovePending || isApproveConfirming ? "⏳" : "Approve"}
              </button>
            ) : (
              <button
                className="w-full rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-3 py-2 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 disabled:opacity-60 transition-all shadow-lg shadow-red-500/20"
                disabled={props.disabled || isPending || isConfirming || tokensInWei === 0n}
                onClick={() =>
                  writeContract({
                    address: props.market,
                    abi: bondingCurveMarketAbi,
                    functionName: "sell",
                    args: [tokensInWei, minBnbOut, address!]
                  })
                }
              >
                {isPending || isConfirming ? "⏳" : "Sell"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Approve Error */}
      {approveError && (
        <div className="mt-2 text-xs text-red-400">
          {(() => {
            const msg = approveError.message || ''
            if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('cancelled')) {
              return '❌ 授权已取消'
            }
            if (msg.includes('insufficient funds') || msg.includes('INSUFFICIENT_FUNDS')) {
              return '❌ BNB 余额不足（需要 gas 费）'
            }
            const shortMsg = msg.split('\n')[0].substring(0, 100)
            return `❌ ${shortMsg}`
          })()}
        </div>
      )}

      {/* Buy/Sell Error */}
      {error && (
        <div className="mt-2 text-xs text-red-400">
          {(() => {
            const msg = error.message || ''
            // 用户取消交易
            if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('cancelled')) {
              return '❌ 交易已取消'
            }
            // 余额不足
            if (msg.includes('insufficient funds') || msg.includes('INSUFFICIENT_FUNDS')) {
              return '❌ BNB 余额不足'
            }
            // 滑点过高
            if (msg.includes('slippage') || msg.includes('Slippage')) {
              return '❌ 滑点过高，请调整滑点设置'
            }
            // 其他错误 - 只显示简短信息
            const shortMsg = msg.split('\n')[0].substring(0, 100)
            return `❌ ${shortMsg}`
          })()}
        </div>
      )}
    </div>
  )
}
