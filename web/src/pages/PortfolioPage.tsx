import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { useAccount, useChainId, usePublicClient } from "wagmi"

import { getFactoryAddress } from "../contracts/addresses"
import { erc20Abi, memeTokenFactoryAbi } from "../contracts/abi"
import { formatBn } from "../lib/format"

export default function PortfolioPage() {
  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const factory = getFactoryAddress(chainId)

  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio", chainId, address],
    enabled: !!address && !!publicClient && !!factory,
    queryFn: async () => {
      if (!publicClient) throw new Error("No public client")
      if (!factory) throw new Error("Missing factory address")
      const length = (await publicClient.readContract({
        address: factory,
        abi: memeTokenFactoryAbi,
        functionName: "allTokensLength"
      })) as bigint
      const idx = Array.from({ length: Number(length) }, (_, i) => BigInt(i))

      const tokenAddrs = (await publicClient.multicall({
        contracts: idx.map((i) => ({
          address: factory,
          abi: memeTokenFactoryAbi,
          functionName: "allTokens",
          args: [i]
        }))
      })) as unknown as { result: `0x${string}` }[]
      const tokens = tokenAddrs.map((r) => r.result)

      const balances = (await publicClient.multicall({
        contracts: tokens.map((t) => ({
          address: t,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address!]
        }))
      })) as unknown as { result: bigint }[]

      const symbols = (await publicClient.multicall({
        contracts: tokens.map((t) => ({
          address: t,
          abi: erc20Abi,
          functionName: "symbol"
        }))
      })) as unknown as { result: string }[]

      return tokens
        .map((t, i) => ({
          token: t,
          symbol: symbols[i].result,
          balance: balances[i].result
        }))
        .filter((x) => x.balance > 0n)
        .sort((a, b) => (a.balance > b.balance ? -1 : 1))
    }
  })

  if (!factory) {
    return (
      <div className="glass-card rounded-2xl border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
        ⚠️ 当前仅支持 BSC 主网，请切换到 BSC（ChainId 56）
      </div>
    )
  }
  if (!address) return <div className="glass-card rounded-2xl p-5 text-sm text-neutral-400">💼 请先连接钱包</div>

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="glass-card rounded-2xl p-5">
          <div className="text-lg font-bold gradient-text">钱包</div>
          <div className="mt-2 text-xs text-neutral-500 break-all">{address}</div>
          <div className="mt-4 text-sm text-neutral-300">📊 仅显示当前工厂创建的代币持仓。</div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-3xl font-bold tracking-wide gradient-text">持仓</div>
          <div className="text-sm text-neutral-400">共 {(data?.length ?? 0).toString()} 个</div>
        </div>

        {isLoading && <div className="glass-card rounded-2xl p-5 text-sm text-neutral-400 animate-pulse">加载中…</div>}
        {error && <div className="glass-card rounded-2xl border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">❌ {String(error)}</div>}

        <div className="overflow-hidden glass-card rounded-2xl">
          <div className="divide-y divide-white/5">
            {(data ?? []).map((x) => (
              <div key={x.token} className="grid grid-cols-[1fr,140px,90px] items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors duration-200">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{x.symbol}</div>
                  <div className="truncate text-[11px] text-neutral-500">{x.token}</div>
                </div>
                <div className="text-right text-sm font-medium text-neutral-200">{formatBn(x.balance)}</div>
                <div className="flex justify-end">
                  <Link to={`/token/${x.token}`} className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2 text-xs font-medium text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-blue-500/25">
                    去交易
                  </Link>
                </div>
              </div>
            ))}
            {(data?.length ?? 0) === 0 && !isLoading ? (
              <div className="px-4 py-12 text-center text-sm text-neutral-400">📭 暂无持仓</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
