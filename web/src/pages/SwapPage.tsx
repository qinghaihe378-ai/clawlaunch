import { useState, useEffect } from "react"
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { parseEther, formatEther, type Address, isAddress } from "viem"
import { bsc } from "wagmi/chains"

// PancakeSwap V2 Router ABI
const ROUTER_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactETHForTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  },
  {
    name: "swapExactTokensForETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }]
  }
] as const

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }]
  }
] as const

const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E" as Address
const FACTORY_ADDRESS = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73" as Address
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as Address

// PancakeSwap V2 Factory ABI
const FACTORY_ABI = [
  {
    name: "getPair",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" }
    ],
    outputs: [{ name: "pair", type: "address" }]
  }
] as const

// PancakeSwap V2 Pair ABI
const PAIR_ABI = [
  {
    name: "getReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" }
    ]
  }
] as const

const TOKENS = [
  { symbol: "BNB", address: WBNB, isNative: true, logo: "https://tokens.pancakeswap.finance/images/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c.png" },
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" as Address, logo: "https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png" },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" as Address, logo: "https://tokens.pancakeswap.finance/images/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56.png" },
  { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" as Address, logo: "https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png" },
  { symbol: "ETH", address: "0x2170Ed0880ac9A755FD29B2688956BD959F933F8" as Address, logo: "https://tokens.pancakeswap.finance/images/0x2170Ed0880ac9A755FD29B2688956BD959F933F8.png" },
]

export default function SwapPage() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  const [fromToken, setFromToken] = useState(TOKENS[0])
  const [toToken, setToToken] = useState(TOKENS[1])
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [isApproved, setIsApproved] = useState(true)
  const [showFromSearch, setShowFromSearch] = useState(false)
  const [showToSearch, setShowToSearch] = useState(false)
  const [fromCustomAddress, setFromCustomAddress] = useState("")
  const [toCustomAddress, setToCustomAddress] = useState("")
  const [fromSearchedToken, setFromSearchedToken] = useState<{symbol: string, name: string, address: Address} | null>(null)
  const [toSearchedToken, setToSearchedToken] = useState<{symbol: string, name: string, address: Address} | null>(null)

  // Get quote from PancakeSwap
  const { data: amountsOut } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: "getAmountsOut",
    args: fromAmount && parseFloat(fromAmount) > 0 ? [
      parseEther(fromAmount),
      [fromToken.address, toToken.address]
    ] : undefined,
    query: {
      enabled: !!fromAmount && parseFloat(fromAmount) > 0,
    }
  })

  // Get pair address for liquidity info
  const { data: pairAddress } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [fromToken.address, toToken.address],
    query: {
      enabled: true,
    }
  })

  // Get reserves for liquidity calculation
  const { data: reserves } = useReadContract({
    address: pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress as Address : undefined,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: {
      enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000',
    }
  })

  // Check allowance
  const { data: allowance } = useReadContract({
    address: isAddress(fromToken.address) ? fromToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && fromAmount ? [address, ROUTER_ADDRESS] : undefined,
    query: {
      enabled: !!address && !fromToken.isNative && !!fromAmount && isAddress(fromToken.address),
    }
  })

  // Get balance
  const { data: balance } = useReadContract({
    address: isAddress(fromToken.address) ? fromToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !fromToken.isNative && isAddress(fromToken.address),
    }
  })

  // Update toAmount when quote changes
  useEffect(() => {
    if (amountsOut && amountsOut.length > 1) {
      const formatted = formatEther(amountsOut[1])
      setToAmount(parseFloat(formatted).toFixed(6))
    } else {
      setToAmount("")
    }
  }, [amountsOut])

  // Calculate liquidity and price
  const liquidityInfo = (() => {
    if (!reserves || reserves.length < 2) return null
    
    const reserve0 = parseFloat(formatEther(reserves[0]))
    const reserve1 = parseFloat(formatEther(reserves[1]))
    
    // Calculate price (reserve1 / reserve0)
    const price = reserve0 > 0 ? reserve1 / reserve0 : 0
    
    // Calculate total liquidity in USD (simplified)
    const totalLiquidity = Math.sqrt(reserve0 * reserve1)
    
    return {
      price,
      liquidity: totalLiquidity,
      reserve0,
      reserve1
    }
  })()

  // Check approval status
  useEffect(() => {
    if (allowance && fromAmount) {
      const needed = parseEther(fromAmount)
      setIsApproved(allowance >= needed)
    } else if (fromToken.isNative) {
      setIsApproved(true)
    }
  }, [allowance, fromAmount, fromToken.isNative])

  // Search token by address for FROM
  const { data: fromTokenSymbol } = useReadContract({
    address: isAddress(fromCustomAddress) ? fromCustomAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: isAddress(fromCustomAddress),
    }
  })

  const { data: fromTokenName } = useReadContract({
    address: isAddress(fromCustomAddress) ? fromCustomAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: "name",
    query: {
      enabled: isAddress(fromCustomAddress),
    }
  })

  useEffect(() => {
    if (fromTokenSymbol && fromTokenName && isAddress(fromCustomAddress)) {
      setFromSearchedToken({
        symbol: String(fromTokenSymbol),
        name: String(fromTokenName),
        address: fromCustomAddress as Address,
      })
    } else {
      setFromSearchedToken(null)
    }
  }, [fromTokenSymbol, fromTokenName, fromCustomAddress])

  // Search token by address for TO
  const { data: toTokenSymbol } = useReadContract({
    address: isAddress(toCustomAddress) ? toCustomAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: isAddress(toCustomAddress),
    }
  })

  const { data: toTokenName } = useReadContract({
    address: isAddress(toCustomAddress) ? toCustomAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: "name",
    query: {
      enabled: isAddress(toCustomAddress),
    }
  })

  useEffect(() => {
    if (toTokenSymbol && toTokenName && isAddress(toCustomAddress)) {
      setToSearchedToken({
        symbol: String(toTokenSymbol),
        name: String(toTokenName),
        address: toCustomAddress as Address,
      })
    } else {
      setToSearchedToken(null)
    }
  }, [toTokenSymbol, toTokenName, toCustomAddress])


  // Approve token
  const { writeContract: approve, isPending: isApproving } = useWriteContract()
  
  // Execute swap
  const { writeContract: swap, isPending: isSwapping, data: txHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleApprove = () => {
    if (!address || !fromAmount) return
    
    approve({
      address: fromToken.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ROUTER_ADDRESS, parseEther("1000000")],
    })
  }

  const handleSwap = () => {
    if (!address || !fromAmount || !toAmount) return
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const amountIn = parseEther(fromAmount)
    const amountOutMin = parseEther((parseFloat(toAmount) * (1 - slippage / 100)).toString())
    const path = [fromToken.address, toToken.address]

    if (fromToken.isNative) {
      swap({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, path, address, deadline],
        value: amountIn,
      })
    } else if (toToken.isNative) {
      swap({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [amountIn, amountOutMin, path, address, deadline],
      })
    } else {
      swap({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForTokens",
        args: [amountIn, amountOutMin, path, address, deadline],
      })
    }
  }

  const handleSwitchTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const isOnBSC = chainId === bsc.id
  const formattedBalance = balance ? formatEther(balance) : "0"

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center p-3">
        <div className="w-full max-w-[420px] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
            <h2 className="text-lg font-bold text-white tracking-tight">Swap</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = '/pool'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 rounded-lg text-xs text-blue-400 transition-all border border-blue-500/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M2 12h20"/>
                </svg>
                <span className="font-medium">添加流动性</span>
              </button>
              <button
                onClick={() => setSlippage(slippage === 0.5 ? 1 : 0.5)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 transition-all border border-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                <span className="font-medium">{slippage}%</span>
              </button>
            </div>
          </div>
          
          <div className="p-3 space-y-2">
            {/* From Token Card */}
            <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all group">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">From</span>
                {address && !fromToken.isNative && (
                  <button 
                    onClick={() => setFromAmount(formattedBalance)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Balance: {parseFloat(formattedBalance).toFixed(4)}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-light text-white placeholder-gray-700 focus:outline-none min-w-0"
                />
                <button
                  onClick={() => {
                    setShowFromSearch(!showFromSearch)
                    setShowToSearch(false)
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap text-xs"
                >
                  <div className="relative w-5 h-5">
                    {fromToken.logo && (
                      <img 
                        src={fromToken.logo} 
                        alt={fromToken.symbol} 
                        className="w-5 h-5 rounded-full absolute inset-0"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div className={`w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold ${fromToken.logo ? 'opacity-0' : ''}`}>
                      {fromToken.symbol[0]}
                    </div>
                  </div>
                  <span>{fromToken.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-70">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>

              {/* Token Selector Dropdown */}
              {showFromSearch && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-900 rounded-xl p-3 z-[100] shadow-2xl max-h-[350px] overflow-y-auto border border-white/10">
                  <input
                    type="text"
                    value={fromCustomAddress}
                    onChange={(e) => setFromCustomAddress(e.target.value)}
                    placeholder="搜索名称或粘贴地址"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-2 transition-colors"
                  />

                  {fromSearchedToken && (
                    <div className="mb-2 p-2.5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                          {fromSearchedToken.symbol[0]}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white">{fromSearchedToken.symbol}</div>
                          <div className="text-[10px] text-gray-400">{fromSearchedToken.name}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newToken = {
                            symbol: fromSearchedToken.symbol,
                            address: fromSearchedToken.address,
                            isNative: false,
                            logo: `https://tokens.pancakeswap.finance/images/${fromSearchedToken.address}.png`,
                          }
                          setFromToken(newToken)
                          setShowFromSearch(false)
                          setFromAmount("")
                          setFromSearchedToken(null)
                          setFromCustomAddress("")
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-xs font-semibold text-white transition-all"
                      >
                        导入代币
                      </button>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-2 font-medium">常用代币</div>
                    <div className="grid grid-cols-4 gap-2">
                      {TOKENS.slice(0, 4).map(token => (
                        <button
                          key={token.symbol}
                          onClick={() => {
                            setFromToken(token)
                            setShowFromSearch(false)
                            setFromAmount("")
                          }}
                          className="px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors text-center"
                        >
                          {token.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {TOKENS.map(token => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          setFromToken(token)
                          setShowFromSearch(false)
                          setFromAmount("")
                        }}
                        className="w-full px-2.5 py-2 rounded-lg text-left hover:bg-white/5 transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative w-6 h-6">
                            {token.logo && (
                              <img 
                                src={token.logo} 
                                alt={token.symbol} 
                                className="w-6 h-6 rounded-full absolute inset-0"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                              />
                            )}
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold ${token.logo ? 'opacity-0' : ''}`}>
                              {token.symbol[0]}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-white">{token.symbol}</div>
                            <div className="text-[10px] text-gray-500">{token.isNative ? 'Native' : 'BEP-20'}</div>
                          </div>
                        </div>
                        {fromToken.symbol === token.symbol && (
                          <span className="text-blue-400 text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Switch Button */}
            <div className="flex justify-center -my-0.5 relative z-10">
              <button
                onClick={handleSwitchTokens}
                className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all shadow-xl shadow-blue-600/30 active:scale-95 border border-white/10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </button>
            </div>

            {/* To Token Card */}
            <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">To</span>
                {toAmount && <span className="text-[10px] text-blue-400 font-medium">≈ ${toAmount}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-light text-white placeholder-gray-700 focus:outline-none min-w-0"
                />
                <button
                  onClick={() => {
                    setShowToSearch(!showToSearch)
                    setShowFromSearch(false)
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-all border border-white/10 whitespace-nowrap text-xs"
                >
                  <div className="relative w-5 h-5">
                    {toToken.logo && (
                      <img 
                        src={toToken.logo} 
                        alt={toToken.symbol} 
                        className="w-5 h-5 rounded-full absolute inset-0"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold ${toToken.logo ? 'opacity-0' : ''}`}>
                      {toToken.symbol[0]}
                    </div>
                  </div>
                  <span>{toToken.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-70">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>

              {/* Token Selector Dropdown */}
              {showToSearch && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-gray-900 rounded-xl p-3 z-[100] shadow-2xl max-h-[350px] overflow-y-auto border border-white/10">
                  <input
                    type="text"
                    value={toCustomAddress}
                    onChange={(e) => setToCustomAddress(e.target.value)}
                    placeholder="搜索名称或粘贴地址"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3 transition-colors"
                  />

                  {toSearchedToken && (
                    <div className="mb-3 p-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-base font-bold">
                          {toSearchedToken.symbol[0]}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">{toSearchedToken.symbol}</div>
                          <div className="text-xs text-gray-400">{toSearchedToken.name}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newToken = {
                            symbol: toSearchedToken.symbol,
                            address: toSearchedToken.address,
                            isNative: false,
                            logo: `https://tokens.pancakeswap.finance/images/${toSearchedToken.address}.png`,
                          }
                          setToToken(newToken)
                          setShowToSearch(false)
                          setToSearchedToken(null)
                          setToCustomAddress("")
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-xs font-semibold text-white transition-all"
                      >
                        导入代币
                      </button>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-2 font-medium">常用代币</div>
                    <div className="grid grid-cols-4 gap-2">
                      {TOKENS.slice(0, 4).map(token => (
                        <button
                          key={token.symbol}
                          onClick={() => {
                            setToToken(token)
                            setShowToSearch(false)
                          }}
                          className="px-2 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors text-center"
                        >
                          {token.symbol}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {TOKENS.map(token => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          setToToken(token)
                          setShowToSearch(false)
                        }}
                        className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/5 transition-colors flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-7 h-7">
                            {token.logo && (
                              <img 
                                src={token.logo} 
                                alt={token.symbol} 
                                className="w-7 h-7 rounded-full absolute inset-0"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                              />
                            )}
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold ${token.logo ? 'opacity-0' : ''}`}>
                              {token.symbol[0]}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-white">{token.symbol}</div>
                            <div className="text-xs text-gray-500">{token.isNative ? 'Native' : 'BEP-20'}</div>
                          </div>
                        </div>
                        {toToken.symbol === token.symbol && (
                          <span className="text-blue-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          {/* Status Messages */}
          {isApproving && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-sm text-blue-400 font-medium">⏳ 授权中...</span>
            </div>
          )}

          {isSwapping && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-sm text-yellow-400 font-medium">⏳ 等待确认...</span>
            </div>
          )}

          {isConfirming && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-sm text-purple-400 font-medium">⏳ 交易中...</span>
            </div>
          )}

          {isConfirmed && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center backdrop-blur-sm">
              <span className="text-xs text-green-400 font-medium">✅ 交易成功！</span>
            </div>
          )}

          {/* Liquidity Info */}
          {liquidityInfo && fromAmount && parseFloat(fromAmount) > 0 && (
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">价格</span>
                <span className="text-white font-medium">
                  1 {fromToken.symbol} ≈ {liquidityInfo.price.toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">流动性</span>
                <span className="text-white font-medium">
                  ${liquidityInfo.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">滑点</span>
                <span className="text-blue-400 font-medium">{slippage}%</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!address ? (
            <button
              disabled
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-white opacity-50 cursor-not-allowed shadow-xl text-sm"
            >
              连接钱包
            </button>
          ) : !isOnBSC ? (
            <button
              disabled
              className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-black opacity-50 cursor-not-allowed shadow-xl text-sm"
            >
              切换网络
            </button>
          ) : !fromAmount || parseFloat(fromAmount) <= 0 ? (
            <button
              disabled
              className="w-full py-3.5 bg-white/5 rounded-xl font-bold text-gray-500 cursor-not-allowed border border-white/5 text-sm"
            >
              输入金额
            </button>
          ) : !isApproved && !fromToken.isNative ? (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 active:scale-[0.98] text-sm"
            >
              {isApproving ? "授权中..." : `授权 ${fromToken.symbol}`}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={isSwapping || isConfirming || !toAmount}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 active:scale-[0.98] text-sm"
            >
              {isSwapping ? "确认中..." : isConfirming ? "交易中..." : "交换"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
