import { useState } from "react"
import { useAccount } from "wagmi"

export default function PoolPage() {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add")

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center p-3">
      <div className="w-full max-w-[420px] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
          <h2 className="text-lg font-bold text-white tracking-tight">Liquidity</h2>
          <button
            onClick={() => window.location.href = '/swap'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 transition-all border border-white/5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
            <span>返回 Swap</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => setActiveTab("add")}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === "add"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-500 hover:text-gray-400"
            }`}
          >
            添加流动性
          </button>
          <button
            onClick={() => setActiveTab("remove")}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === "remove"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-500 hover:text-gray-400"
            }`}
          >
            移除流动性
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!address ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <p className="text-gray-400 text-sm mb-4">请连接钱包以管理流动性</p>
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-white text-sm hover:from-blue-500 hover:to-purple-500 transition-all">
                连接钱包
              </button>
            </div>
          ) : (
            <>
              {activeTab === "add" ? (
                <div className="space-y-4">
                  {/* Token Selection */}
                  <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-4 border border-white/5">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Token 1</label>
                        <button className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold text-sm transition-all">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                              B
                            </div>
                            <span>BNB</span>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 mb-1.5 block">Token 2</label>
                        <button className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold text-sm transition-all border border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                              U
                            </div>
                            <span>USDT</span>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Amount Inputs */}
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">BNB 数量</span>
                        <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">Balance: 0.0000</span>
                      </div>
                      <input
                        type="number"
                        placeholder="0.0"
                        className="w-full bg-transparent text-2xl font-light text-white placeholder-gray-700 focus:outline-none"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-4 border border-white/5">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">USDT 数量</span>
                        <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">Balance: 0.0000</span>
                      </div>
                      <input
                        type="number"
                        placeholder="0.0"
                        className="w-full bg-transparent text-2xl font-light text-white placeholder-gray-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-3 border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Share of Pool</span>
                      <span className="text-white font-medium">0%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Rates</span>
                      <span className="text-white font-medium">1 BNB ≈ 0 USDT</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                    添加流动性
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💧</div>
                  <p className="text-gray-400 text-sm">暂无流动性头寸</p>
                  <p className="text-gray-600 text-xs mt-2">添加流动性后将在此显示</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
