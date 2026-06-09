import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { parseEventLogs } from "viem"

import { getFactoryAddress } from "../contracts/addresses"
import { memeTokenFactoryAbi } from "../contracts/abi"

export default function CreateTokenPage() {
  const navigate = useNavigate()
  const { address } = useAccount()
  const chainId = useChainId()
  const factory = getFactoryAddress(chainId)

  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [description, setDescription] = useState("")
  const [logo, setLogo] = useState("")
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const [telegram, setTelegram] = useState("")
  const [twitter, setTwitter] = useState("")
  const [website, setWebsite] = useState("")
  const [targetRaiseOption, setTargetRaiseOption] = useState<"3" | "2" | "1">("3")
  const [templateId, setTemplateId] = useState<0 | 1>(0)
  const [taxRatePercent, setTaxRatePercent] = useState("1.0")
  const [burnSharePercent, setBurnSharePercent] = useState("20")
  const [holderSharePercent, setHolderSharePercent] = useState("40")
  const [buybackSharePercent, setBuybackSharePercent] = useState("20")

  const { data: creationFee } = useReadContract({
    address: factory,
    abi: memeTokenFactoryAbi,
    functionName: "creationFee",
    query: { enabled: !!factory }
  })

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash
  })

  const taxConfig = useMemo(() => {
    if (templateId === 0) {
      return {
        ok: true as const,
        templateId: 0 as const,
        taxBps: 0,
        burnShareBps: 0,
        holderShareBps: 0,
        liquidityShareBps: 0,
        buybackShareBps: 0
      }
    }

    const taxPct = Number(taxRatePercent || "0")
    if (!Number.isFinite(taxPct)) return { ok: false as const, reason: "税率不合法" }
    const taxBps = Math.round(taxPct * 100)
    if (taxBps < 10 || taxBps > 500) return { ok: false as const, reason: "税率范围 0.1%-5%" }

    const burnPct = Number(burnSharePercent || "0")
    const holderPct = Number(holderSharePercent || "0")
    const buybackPct = Number(buybackSharePercent || "0")
    if (![burnPct, holderPct, buybackPct].every((v) => Number.isFinite(v) && v >= 0)) {
      return { ok: false as const, reason: "分配比例不合法" }
    }

    const burnShareBps = Math.round(burnPct * 100)
    const holderShareBps = Math.round(holderPct * 100)
    const liquidityShareBps = 0
    const buybackShareBps = Math.round(buybackPct * 100)
    const sum = burnShareBps + holderShareBps + liquidityShareBps + buybackShareBps
    if (sum !== 10_000) return { ok: false as const, reason: "分配比例总和需要等于 100%" }

    return {
      ok: true as const,
      templateId: 1 as const,
      taxBps,
      burnShareBps,
      holderShareBps,
      liquidityShareBps,
      buybackShareBps
    }
  }, [
    templateId,
    taxRatePercent,
    burnSharePercent,
    holderSharePercent,
    buybackSharePercent
  ])

  const logoForTx = useMemo(() => {
    const v = logo.trim()
    if (!v) return ""
    if (v.startsWith("data:")) return ""
    return v
  }, [logo])

  const logoHint = useMemo(() => {
    const v = logo.trim()
    if (!v) return null
    if (v.startsWith("data:")) return "封面为本地图片预览，不会上链；如需上链请填写图片 URL（https://... 或 ipfs://...）"
    return null
  }, [logo])

  const disabledReason = useMemo(() => {
    if (!factory) return "未检测到 Factory（请确认当前链为 BSC 56）"
    if (creationFee === undefined) return "读取创建费用失败"
    if (!taxConfig.ok) return taxConfig.reason
    if (isPending) return "提交中…"
    if (isConfirming) return "确认中…"
    return null
  }, [factory, creationFee, taxConfig, isPending, isConfirming])

  const disabled = Boolean(disabledReason)

  return (
    <div className="space-y-4">
      <div className="text-3xl font-bold tracking-wide gradient-text">🚀 创建你的代币</div>

      <div>
        <input
          ref={logoInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            if (!f.type.startsWith("image/")) {
              setLogo("")
              setLogoError("请选择图片文件")
              if (logoInputRef.current) logoInputRef.current.value = ""
              return
            }
            if (f.size > 1024 * 1024) {
              setLogo("")
              setLogoError("图片过大，请选择 1MB 以内")
              if (logoInputRef.current) logoInputRef.current.value = ""
              return
            }
            const r = new FileReader()
            r.onload = () => {
              const v = typeof r.result === "string" ? r.result : ""
              setLogo(v)
              setLogoError(null)
            }
            r.onerror = () => {
              setLogo("")
              setLogoError("读取图片失败")
            }
            r.readAsDataURL(f)
          }}
        />
        <div
          className="group relative mt-1 aspect-square w-full overflow-hidden rounded-2xl border-2 border-white/10 bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:border-white/30 transition-all duration-300 glow-effect"
          role="button"
          tabIndex={0}
          onClick={() => logoInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") logoInputRef.current?.click()
          }}
        >
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
              📸 点击上传封面（512×512，1MB以内）
            </div>
          )}
          {logo ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="text-xs text-neutral-200">点击更换</div>
              <button
                type="button"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/20 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation()
                  setLogo("")
                  setLogoError(null)
                  if (logoInputRef.current) logoInputRef.current.value = ""
                }}
              >
                清除
              </button>
            </div>
          ) : null}
        </div>
        {logoError && <div className="mt-2 text-sm text-red-400">❌ {logoError}</div>}

      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="grid gap-4">
          <div>
            <div className="text-sm font-medium text-neutral-300">名称</div>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：龙虾 Inu"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300">符号</div>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="例如：龙虾"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300">描述</div>
            <textarea
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="一句话介绍"
              rows={3}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300">Telegram 链接（可选）</div>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="https://t.me/xxx"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300">Twitter 链接（可选）</div>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://twitter.com/xxx 或 https://x.com/xxx"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300">Website 链接（可选）</div>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300 mb-2">打满线</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "3", label: "3 BNB" },
                { value: "2", label: "2 BNB" },
                { value: "1", label: "1 BNB" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTargetRaiseOption(option.value as "3" | "2" | "1")}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    targetRaiseOption === option.value
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white/10 text-neutral-300 border border-white/10 hover:bg-white/15"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-300 mb-2">机制</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 0, label: "基础版（无税）" },
                { value: 1, label: "税费版（分红/销毁/回流）" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTemplateId(option.value as 0 | 1)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    templateId === option.value
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white/10 text-neutral-300 border border-white/10 hover:bg-white/15"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
            {templateId === 1 ? (
              <div className="glass-card rounded-xl p-4">
                <div className="text-sm font-semibold gradient-text">⚙️ 税费参数</div>
                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="text-xs text-neutral-400">税率（0.1%-5%）</div>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 placeholder:text-neutral-500"
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(e.target.value)}
                      placeholder="例如：1.0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-neutral-400">持币分红（%）</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200"
                        value={holderSharePercent}
                        onChange={(e) => setHolderSharePercent(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">代币销毁（%）</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200"
                        value={burnSharePercent}
                        onChange={(e) => setBurnSharePercent(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">回流（%）</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200"
                        value={buybackSharePercent}
                        onChange={(e) => setBuybackSharePercent(e.target.value)}
                      />
                    </div>
                  </div>
                  {!taxConfig.ok ? <div className="text-sm text-red-400">❌ {taxConfig.reason}</div> : null}
                </div>
              </div>
            ) : null}
          <button
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 glow-effect"
            disabled={disabled}
            onClick={() =>
              writeContract(
                {
                  address: factory!,
                  abi: memeTokenFactoryAbi,
                  functionName: "createToken",
                  args: [
                    name.trim(),
                    symbol.trim(),
                    description.trim(),
                    logoForTx,
                    telegram.trim(),
                    twitter.trim(),
                    website.trim(),
                    targetRaiseOption === "2" ? 2000000000000000000n : targetRaiseOption === "1" ? 1000000000000000000n : 3000000000000000000n,
                    taxConfig.ok ? taxConfig.templateId : 0,
                    taxConfig.ok ? taxConfig.taxBps : 0,
                    taxConfig.ok ? taxConfig.burnShareBps : 0,
                    taxConfig.ok ? taxConfig.holderShareBps : 0,
                    taxConfig.ok ? taxConfig.liquidityShareBps : 0,
                    taxConfig.ok ? taxConfig.buybackShareBps : 0
                  ],
                  value: creationFee as bigint
                },
                {
                  onSuccess: (hash) => {
                    void hash
                  }
                }
              )
            }
          >
            {isPending ? "提交中…" : isConfirming ? "确认中…" : "创建代币"}
          </button>


          {disabledReason && !isPending && !isConfirming ? (
            <div className="mt-2 text-sm text-neutral-400">{disabledReason}</div>
          ) : null}
          {error && <div className="text-sm text-red-400">{error.message}</div>}
        </div>
      </div>

        {txHash && (
          <TxWatcher
            txHash={txHash}
            onToken={(token) => {
              navigate(`/token/${token}`)
            }}
          />
        )}
    </div>
  )
}

function TxWatcher(props: { txHash: `0x${string}`; onToken: (token: `0x${string}`) => void }) {
  const chainId = useChainId()
  const factory = getFactoryAddress(chainId)
  const { data } = useWaitForTransactionReceipt({ hash: props.txHash })

  if (!data) return null

  try {
    const logs = parseEventLogs({
      abi: memeTokenFactoryAbi,
      logs: data.logs,
      eventName: "TokenCreated"
    })
    const token = logs[0]?.args?.token as `0x${string}` | undefined
    
    if (token) {
      // 延迟触发验证（等待 BSCScan 索引）
      setTimeout(() => {
        autoVerifyToken(token, chainId)
      }, 3000)
      props.onToken(token)
    }
  } catch {
    void 0
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
      已确认：{props.txHash}
      <div className="mt-1 text-xs text-neutral-500">Factory: {factory}</div>
    </div>
  )
}

// 自动验证代币合约（简化版：所有代币都尝试验证）
async function autoVerifyToken(token: string, chainId: number) {
  try {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://clawlaunch.qinghaihe378.workers.dev'
    // 默认尝试 templateId=1 (有税代币)
    const response = await fetch(
      `${apiBaseUrl}/api/verify-token?address=${token}&templateId=1&chainId=${chainId}`
    )
    const data = await response.json()
    
    if (data.code === 0) {
      console.log('[Auto Verify] Verification submitted for token:', token)
    } else {
      console.warn('[Auto Verify] Verification failed:', data.message)
    }
  } catch (error) {
    console.error('[Auto Verify] Error:', error)
  }
}
