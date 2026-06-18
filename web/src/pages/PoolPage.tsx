import { useState, useEffect } from "react"
import { useAccount, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
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
    name: "addLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" }
    ]
  },
  {
    name: "addLiquidityETH",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountTokenDesired", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountETH", type: "uint256" },
      { name: "liquidity", type: "uint256" }
    ]
  },
  {
    name: "removeLiquidity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" }
    ]
  },
  {
    name: "removeLiquidityETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountETH", type: "uint256" }
    ]
  }
] as const

// ERC20 ABI
const ERC20_ABI = [
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
  },
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
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const

const TOKENS = [
  { symbol: "BNB", address: WBNB, isNative: true, logo: "https://tokens.pancakeswap.finance/images/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c.png" },
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" as Address, logo: "https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png" },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" as Address, logo: "https://tokens.pancakeswap.finance/images/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56.png" },
  { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" as Address, logo: "https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png" },
  { symbol: "ETH", address: "0x2170Ed0880ac9A755FD29B2688956BD959F933F8" as Address, logo: "https://tokens.pancakeswap.finance/images/0x2170Ed0880ac9A755FD29B2688956BD959F933F8.png" },
]

export default function PoolPage() {
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  
  const [activeTab, setActiveTab] = useState<'add' | 'remove' | 'my'>('add')
  const [poolTokenA, setPoolTokenA] = useState(TOKENS[0])
  const [poolTokenB, setPoolTokenB] = useState(TOKENS[1])
  const [amountA, setAmountA] = useState("")
  const [amountB, setAmountB] = useState("")
  const [showPoolASearch, setShowPoolASearch] = useState(false)
  const [showPoolBSearch, setShowPoolBSearch] = useState(false)
  const [fromCustomAddress, setFromCustomAddress] = useState("")
  const [toCustomAddress, setToCustomAddress] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [showSlippageModal, setShowSlippageModal] = useState(false)
  const [customSlippage, setCustomSlippage] = useState("")
  
  // Searched token info
  const [fromSearchedToken, setFromSearchedToken] = useState<{symbol: string, name: string, address: Address} | null>(null)
  const [toSearchedToken, setToSearchedToken] = useState<{symbol: string, name: string, address: Address} | null>(null)
  
  // Search token by address for Token A
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

  // Search token by address for Token B
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
  
  // Remove Liquidity states
  const [removeTokenA, setRemoveTokenA] = useState(TOKENS[0])
  const [removeTokenB, setRemoveTokenB] = useState(TOKENS[1])
  const [removePercentage, setRemovePercentage] = useState(50)
  const [showRemoveASearch, setShowRemoveASearch] = useState(false)
  const [showRemoveBSearch, setShowRemoveBSearch] = useState(false)
  const [removeCustomAddressA, setRemoveCustomAddressA] = useState("")
  const [removeCustomAddressB, setRemoveCustomAddressB] = useState("")
  
  // Searched token info for remove
  const [removeSearchedTokenA, setRemoveSearchedTokenA] = useState<{symbol: string, name: string, address: Address} | null>(null)
  const [removeSearchedTokenB, setRemoveSearchedTokenB] = useState<{symbol: string, name: string, address: Address} | null>(null)
  
  // Search token by address for Remove Token A
  const { data: removeTokenASymbol } = useReadContract({
    address: isAddress(removeCustomAddressA) ? removeCustomAddressA as Address : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: isAddress(removeCustomAddressA),
    }
  })

  const { data: removeTokenAName } = useReadContract({
    address: isAddress(removeCustomAddressA) ? removeCustomAddressA as Address : undefined,
    abi: ERC20_ABI,
    functionName: "name",
    query: {
      enabled: isAddress(removeCustomAddressA),
    }
  })

  useEffect(() => {
    if (removeTokenASymbol && removeTokenAName && isAddress(removeCustomAddressA)) {
      setRemoveSearchedTokenA({
        symbol: String(removeTokenASymbol),
        name: String(removeTokenAName),
        address: removeCustomAddressA as Address,
      })
    } else {
      setRemoveSearchedTokenA(null)
    }
  }, [removeTokenASymbol, removeTokenAName, removeCustomAddressA])

  // Search token by address for Remove Token B
  const { data: removeTokenBSymbol } = useReadContract({
    address: isAddress(removeCustomAddressB) ? removeCustomAddressB as Address : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: {
      enabled: isAddress(removeCustomAddressB),
    }
  })

  const { data: removeTokenBName } = useReadContract({
    address: isAddress(removeCustomAddressB) ? removeCustomAddressB as Address : undefined,
    abi: ERC20_ABI,
    functionName: "name",
    query: {
      enabled: isAddress(removeCustomAddressB),
    }
  })

  useEffect(() => {
    if (removeTokenBSymbol && removeTokenBName && isAddress(removeCustomAddressB)) {
      setRemoveSearchedTokenB({
        symbol: String(removeTokenBSymbol),
        name: String(removeTokenBName),
        address: removeCustomAddressB as Address,
      })
    } else {
      setRemoveSearchedTokenB(null)
    }
  }, [removeTokenBSymbol, removeTokenBName, removeCustomAddressB])

  // Get quote for liquidity price calculation (Token A -> Token B)
  const { data: poolAmountsOut } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: "getAmountsOut",
    args: amountA && parseFloat(amountA) > 0 ? [
      parseEther(amountA),
      [poolTokenA.address, poolTokenB.address]
    ] : undefined,
    query: {
      enabled: !!amountA && parseFloat(amountA) > 0,
    }
  })

  // Get balance for token A
  const { data: poolTokenABalance } = useReadContract({
    address: isAddress(poolTokenA.address) ? poolTokenA.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !poolTokenA.isNative && isAddress(poolTokenA.address),
    }
  })

  // Get balance for token B
  const { data: poolTokenBBalance } = useReadContract({
    address: isAddress(poolTokenB.address) ? poolTokenB.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !poolTokenB.isNative && isAddress(poolTokenB.address),
    }
  })

  // Calculate pool price from PancakeSwap quote
  const poolPriceInfo = (() => {
    if (!poolAmountsOut || poolAmountsOut.length < 2 || !amountA || parseFloat(amountA) <= 0) return null
    
    const amountBFromQuote = parseFloat(formatEther(poolAmountsOut[1]))
    const amountAValue = parseFloat(amountA)
    
    if (amountAValue <= 0) return null
    
    const price = amountBFromQuote / amountAValue
    const reversePrice = amountAValue / amountBFromQuote
    
    return {
      price,
      reversePrice,
      amountBFromQuote
    }
  })()

  const isOnBSC = chainId === bsc.id
  
  // Add Liquidity: Check allowances
  const { data: tokenAAllowance } = useReadContract({
    address: isAddress(poolTokenA.address) ? poolTokenA.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && amountA ? [address, ROUTER_ADDRESS] : undefined,
    query: {
      enabled: !!address && !poolTokenA.isNative && !!amountA && isAddress(poolTokenA.address),
    }
  })
  
  const { data: tokenBAllowance } = useReadContract({
    address: isAddress(poolTokenB.address) ? poolTokenB.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && amountB ? [address, ROUTER_ADDRESS] : undefined,
    query: {
      enabled: !!address && !poolTokenB.isNative && !!amountB && isAddress(poolTokenB.address),
    }
  })
  
  const isTokenAAproved = (() => {
    if (poolTokenA.isNative) return true
    if (!tokenAAllowance || !amountA) return false
    return tokenAAllowance >= parseEther(amountA)
  })()
  
  const isTokenBApproved = (() => {
    if (poolTokenB.isNative) return true
    if (!tokenBAllowance || !amountB) return false
    return tokenBAllowance >= parseEther(amountB)
  })()
  
  // Remove Liquidity: Get pair and LP balance
  const { data: removePairAddress } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [removeTokenA.address, removeTokenB.address],
    query: {
      enabled: true,
    }
  })
  
  const { data: lpBalance } = useReadContract({
    address: removePairAddress && removePairAddress !== '0x0000000000000000000000000000000000000000' ? removePairAddress as Address : undefined,
    abi: PAIR_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!removePairAddress && removePairAddress !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const { data: lpTotalSupply } = useReadContract({
    address: removePairAddress && removePairAddress !== '0x0000000000000000000000000000000000000000' ? removePairAddress as Address : undefined,
    abi: PAIR_ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!removePairAddress && removePairAddress !== '0x0000000000000000000000000000000000000000',
    }
  })
  
  const hasLiquidity = lpBalance && lpBalance > 0n
  const lpSharePercentage = lpBalance && lpTotalSupply && lpTotalSupply > 0n 
    ? (Number(lpBalance) / Number(lpTotalSupply)) * 100 
    : 0
  
  // Write contracts for add/remove liquidity
  const { writeContract: approveToken, isPending: isApproving } = useWriteContract()
  const { writeContract: addLiquidityTx, isPending: isAdding, data: addTxHash } = useWriteContract()
  const { writeContract: removeLiquidityTx, isPending: isRemoving, data: removeTxHash } = useWriteContract()
  
  const { isLoading: isAddConfirming, isSuccess: isAddConfirmed } = useWaitForTransactionReceipt({ hash: addTxHash })
  const { isLoading: isRemoveConfirming, isSuccess: isRemoveConfirmed } = useWaitForTransactionReceipt({ hash: removeTxHash })
  
  const handleApproveTokenA = () => {
    if (!address || !amountA) return
    approveToken({
      address: poolTokenA.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ROUTER_ADDRESS, parseEther("1000000")],
    })
  }
  
  const handleApproveTokenB = () => {
    if (!address || !amountB) return
    approveToken({
      address: poolTokenB.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ROUTER_ADDRESS, parseEther("1000000")],
    })
  }
  
  const handleAddLiquidity = () => {
    if (!address || !amountA || !amountB) return
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const amountADesired = parseEther(amountA)
    const amountBDesired = parseEther(amountB)
    const slippageTolerance = slippage / 100
    const amountAMin = amountADesired * BigInt(Math.floor((1 - slippageTolerance) * 1000)) / BigInt(1000)
    const amountBMin = amountBDesired * BigInt(Math.floor((1 - slippageTolerance) * 1000)) / BigInt(1000)
    
    if (poolTokenA.isNative) {
      addLiquidityTx({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "addLiquidityETH",
        args: [poolTokenB.address, amountBDesired, amountBMin, amountAMin, address, deadline],
        value: amountADesired,
      })
    } else if (poolTokenB.isNative) {
      addLiquidityTx({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "addLiquidityETH",
        args: [poolTokenA.address, amountADesired, amountAMin, amountBMin, address, deadline],
        value: amountBDesired,
      })
    } else {
      addLiquidityTx({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "addLiquidity",
        args: [poolTokenA.address, poolTokenB.address, amountADesired, amountBDesired, amountAMin, amountBMin, address, deadline],
      })
    }
  }
  
  const handleRemoveLiquidity = () => {
    if (!address || !lpBalance || lpBalance === 0n) return
    
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
    const liquidityToRemove = lpBalance * BigInt(removePercentage) / BigInt(100)
    const amountAMin = 0n // For simplicity, set to 0. In production, calculate properly
    const amountBMin = 0n
    
    if (removeTokenA.isNative || removeTokenB.isNative) {
      const token = removeTokenA.isNative ? removeTokenB.address : removeTokenA.address
      removeLiquidityTx({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "removeLiquidityETH",
        args: [token, liquidityToRemove, amountAMin, amountBMin, address, deadline],
      })
    } else {
      removeLiquidityTx({
        address: ROUTER_ADDRESS,
        abi: ROUTER_ABI,
        functionName: "removeLiquidity",
        args: [removeTokenA.address, removeTokenB.address, liquidityToRemove, amountAMin, amountBMin, address, deadline],
      })
    }
  }

  return (
    <div className="w-full flex justify-center pt-4 p-3">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col px-4 py-3 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white tracking-tight">
              流动性管理
            </h2>
            {activeTab === 'add' && (
              <button
                onClick={() => setShowSlippageModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 transition-all border border-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-70">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                <span className="font-medium">{slippage}%</span>
              </button>
            )}
          </div>
          
          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95 ${
                activeTab === 'add'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              添加
            </button>
            <button
              onClick={() => setActiveTab('remove')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95 ${
                activeTab === 'remove'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              移除
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 active:scale-95 ${
                activeTab === 'my'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              我的
            </button>
          </div>
        </div>
        
        <div className="p-3 space-y-2">
          {activeTab === 'add' && (
            <>
          {/* Token A Input */}
          <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Token A</span>
              {address && !poolTokenA.isNative && poolTokenABalance !== undefined && poolTokenABalance > 0n && (
                <button 
                  onClick={() => setAmountA(formatEther(poolTokenABalance))}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Balance: {parseFloat(formatEther(poolTokenABalance)).toFixed(4)}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-2xl font-light text-white placeholder-gray-500 focus:outline-none min-w-0"
              />
              <button
                onClick={() => {
                  setShowPoolASearch(!showPoolASearch)
                  setShowPoolBSearch(false)
                }}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-all border border-white/10 whitespace-nowrap text-xs"
              >
                <div className="relative w-5 h-5">
                  {poolTokenA.logo && (
                    <img 
                      src={poolTokenA.logo} 
                      alt={poolTokenA.symbol} 
                      className="w-5 h-5 rounded-full absolute inset-0"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold ${poolTokenA.logo ? 'opacity-0' : ''}`}>
                    {poolTokenA.symbol[0]}
                  </div>
                </div>
                <span>{poolTokenA.symbol}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-70">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            {/* Token A Selector Bottom Sheet */}
            {showPoolASearch && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
                  onClick={() => setShowPoolASearch(false)}
                />
                
                {/* Bottom Sheet */}
                <div className="fixed bottom-0 left-0 right-0 z-[151] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
                  {/* Handle Bar */}
                  <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 z-10">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                  </div>

                  <div className="px-4 pb-6 space-y-3">
                    <input
                      type="text"
                      value={fromCustomAddress}
                      onChange={(e) => setFromCustomAddress(e.target.value)}
                      placeholder="搜索名称或粘贴地址"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors sticky top-12 z-10"
                    />
                    
                    {/* Searched Token Result */}
                    {fromSearchedToken && (
                      <div className="mb-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
                            {fromSearchedToken.symbol[0]}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-white">{fromSearchedToken.symbol}</div>
                            <div className="text-xs text-gray-400">{fromSearchedToken.name}</div>
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
                            setPoolTokenA(newToken)
                            setShowPoolASearch(false)
                            setAmountA("")
                            setFromSearchedToken(null)
                            setFromCustomAddress("")
                          }}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                        >
                          导入代币
                        </button>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {TOKENS.map(token => (
                        <button
                          key={token.symbol}
                          onClick={() => {
                            setPoolTokenA(token)
                            setShowPoolASearch(false)
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
                          {poolTokenA.symbol === token.symbol && (
                            <span className="text-blue-400">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center -my-1">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-2 shadow-xl shadow-blue-600/30 border border-white/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 5v14m-7-7h14"/>
              </svg>
            </div>
          </div>

          {/* Token B Input */}
          <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Token B</span>
              {address && !poolTokenB.isNative && poolTokenBBalance !== undefined && poolTokenBBalance > 0n && (
                <button 
                  onClick={() => setAmountB(formatEther(poolTokenBBalance))}
                  className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Balance: {parseFloat(formatEther(poolTokenBBalance)).toFixed(4)}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-2xl font-light text-white placeholder-gray-500 focus:outline-none min-w-0"
              />
              <button
                onClick={() => {
                  setShowPoolBSearch(!showPoolBSearch)
                  setShowPoolASearch(false)
                }}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-all border border-white/10 whitespace-nowrap text-xs"
              >
                <div className="relative w-5 h-5">
                  {poolTokenB.logo && (
                    <img 
                      src={poolTokenB.logo} 
                      alt={poolTokenB.symbol} 
                      className="w-5 h-5 rounded-full absolute inset-0"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  )}
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold ${poolTokenB.logo ? 'opacity-0' : ''}`}>
                    {poolTokenB.symbol[0]}
                  </div>
                </div>
                <span>{poolTokenB.symbol}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-70">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            {/* Token B Selector Bottom Sheet */}
            {showPoolBSearch && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
                  onClick={() => setShowPoolBSearch(false)}
                />
                
                {/* Bottom Sheet */}
                <div className="fixed bottom-0 left-0 right-0 z-[151] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
                  {/* Handle Bar */}
                  <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 z-10">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                  </div>

                  <div className="px-4 pb-6 space-y-3">
                    <input
                      type="text"
                      value={toCustomAddress}
                      onChange={(e) => setToCustomAddress(e.target.value)}
                      placeholder="搜索名称或粘贴地址"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors sticky top-12 z-10"
                    />
                    
                    {/* Searched Token Result */}
                    {toSearchedToken && (
                      <div className="mb-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
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
                            setPoolTokenB(newToken)
                            setShowPoolBSearch(false)
                            setAmountB("")
                            setToSearchedToken(null)
                            setToCustomAddress("")
                          }}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                        >
                          导入代币
                        </button>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {TOKENS.map(token => (
                        <button
                          key={token.symbol}
                          onClick={() => {
                            setPoolTokenB(token)
                            setShowPoolBSearch(false)
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
                          {poolTokenB.symbol === token.symbol && (
                            <span className="text-blue-400">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pool Info */}
          {(amountA || amountB) && (parseFloat(amountA) > 0 || parseFloat(amountB) > 0) && (
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-3 border border-white/5 space-y-2">
              {poolPriceInfo ? (
                <>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">价格</span>
                    <span className="text-white font-medium">
                      1 {poolTokenA.symbol} ≈ {poolPriceInfo.price.toFixed(6)} {poolTokenB.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">反向价格</span>
                    <span className="text-white font-medium">
                      1 {poolTokenB.symbol} ≈ {poolPriceInfo.reversePrice.toFixed(6)} {poolTokenA.symbol}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">提示</span>
                  <span className="text-blue-400 font-medium">请输入{poolTokenA.symbol}数量以查看价格</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">滑点</span>
                <button 
                  onClick={() => setShowSlippageModal(true)}
                  className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
                >
                  {slippage}%
                </button>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">池子份额</span>
                <span className="text-white font-medium">&lt; 0.001%</span>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {isApproving && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center backdrop-blur-sm">
              <span className="text-xs text-blue-400 font-medium">⏳ 授权中...</span>
            </div>
          )}
          
          {isAdding && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center backdrop-blur-sm">
              <span className="text-xs text-yellow-400 font-medium">⏳ 等待确认...</span>
            </div>
          )}
          
          {isAddConfirming && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center backdrop-blur-sm">
              <span className="text-xs text-purple-400 font-medium">⏳ 添加流动性中...</span>
            </div>
          )}
          
          {isAddConfirmed && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center backdrop-blur-sm">
              <span className="text-xs text-green-400 font-medium">✅ 添加成功！</span>
            </div>
          )}

          {/* Add Liquidity Button */}
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
          ) : !amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0 ? (
            <button
              disabled
              className="w-full py-3.5 bg-white/5 rounded-xl font-bold text-gray-500 cursor-not-allowed border border-white/5 text-sm"
            >
              输入金额
            </button>
          ) : !isTokenAAproved && !poolTokenA.isNative ? (
            <button
              onClick={handleApproveTokenA}
              disabled={isApproving}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 active:scale-[0.98] text-sm"
            >
              {isApproving ? "授权中..." : `授权 ${poolTokenA.symbol}`}
            </button>
          ) : !isTokenBApproved && !poolTokenB.isNative ? (
            <button
              onClick={handleApproveTokenB}
              disabled={isApproving}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 active:scale-[0.98] text-sm"
            >
              {isApproving ? "授权中..." : `授权 ${poolTokenB.symbol}`}
            </button>
          ) : (
            <button
              onClick={handleAddLiquidity}
              disabled={isAdding || isAddConfirming}
              className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-green-600/20 active:scale-[0.98] text-sm"
            >
              {isAdding ? "确认中..." : isAddConfirming ? "添加中..." : "添加流动性"}
            </button>
          )}
            </>
          )}
          
          {activeTab === 'remove' && (
            <div className="space-y-4">
              {/* Status Messages */}
              {isRemoving && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center backdrop-blur-sm">
                  <span className="text-xs text-yellow-400 font-medium">⏳ 等待确认...</span>
                </div>
              )}
              
              {isRemoveConfirming && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center backdrop-blur-sm">
                  <span className="text-xs text-purple-400 font-medium">⏳ 移除流动性中...</span>
                </div>
              )}
              
              {isRemoveConfirmed && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center backdrop-blur-sm">
                  <span className="text-xs text-green-400 font-medium">✅ 移除成功！</span>
                </div>
              )}
              
              {/* Token Pair Selection */}
              <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-4 border border-white/5">
                <div className="text-sm text-gray-400 mb-3">选择要移除的流动性池</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRemoveASearch(true)}
                    className="flex-1 flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-3 rounded-xl transition-all"
                  >
                    <div className="relative w-7 h-7">
                      {removeTokenA.logo && (
                        <img src={removeTokenA.logo} alt={removeTokenA.symbol} className="w-7 h-7 rounded-full absolute inset-0" />
                      )}
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold ${removeTokenA.logo ? 'opacity-0' : ''}`}>
                        {removeTokenA.symbol[0]}
                      </div>
                    </div>
                    <span className="text-white font-semibold">{removeTokenA.symbol}</span>
                  </button>
                  <span className="text-gray-500">+</span>
                  <button
                    onClick={() => setShowRemoveBSearch(true)}
                    className="flex-1 flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-3 rounded-xl transition-all"
                  >
                    <div className="relative w-7 h-7">
                      {removeTokenB.logo && (
                        <img src={removeTokenB.logo} alt={removeTokenB.symbol} className="w-7 h-7 rounded-full absolute inset-0" />
                      )}
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold ${removeTokenB.logo ? 'opacity-0' : ''}`}>
                        {removeTokenB.symbol[0]}
                      </div>
                    </div>
                    <span className="text-white font-semibold">{removeTokenB.symbol}</span>
                  </button>
                </div>
              </div>
              
              {/* LP Balance Info */}
              {hasLiquidity ? (
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">你的流动性份额</span>
                    <span className="text-lg font-bold text-white">{lpSharePercentage.toFixed(4)}%</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    LP Token: {lpBalance ? parseFloat(formatEther(lpBalance)).toFixed(6) : '0'}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-4 border border-white/5 text-center">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-gray-400 text-sm">未找到该交易对的流动性</p>
                </div>
              )}
              
              {/* Percentage Slider */}
              <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between mb-3">
                  <span className="text-sm text-gray-400">移除百分比</span>
                  <span className="text-lg font-bold text-white">{removePercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={removePercentage}
                  onChange={(e) => setRemovePercentage(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex gap-2 mt-3">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setRemovePercentage(pct)}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                        removePercentage === pct
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Remove Button */}
              {!address ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-bold text-white opacity-50 cursor-not-allowed shadow-xl text-sm"
                >
                  连接钱包
                </button>
              ) : !hasLiquidity ? (
                <button
                  disabled
                  className="w-full py-3.5 bg-white/5 rounded-xl font-bold text-gray-500 cursor-not-allowed border border-white/5 text-sm"
                >
                  无流动性可移除
                </button>
              ) : (
                <button
                  onClick={handleRemoveLiquidity}
                  disabled={isRemoving || isRemoveConfirming}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-red-600/20 active:scale-[0.98] text-sm"
                >
                  {isRemoving ? "确认中..." : isRemoveConfirming ? "移除中..." : "移除流动性"}
                </button>
              )}
            </div>
          )}
          
          {activeTab === 'my' && (
            <div className="space-y-3">
              {!address ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold text-white mb-2">连接钱包</h3>
                  <p className="text-gray-400 text-sm">连接钱包后查看你的流动性头寸</p>
                </div>
              ) : hasLiquidity ? (
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-10 h-10">
                      <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold border-2 border-gray-900 z-10">
                        {removeTokenA.symbol[0]}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-xs font-bold border-2 border-gray-900">
                        {removeTokenB.symbol[0]}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-bold">{removeTokenA.symbol} + {removeTokenB.symbol}</div>
                      <div className="text-xs text-gray-400">PancakeSwap V2</div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">池子份额</span>
                      <span className="text-white font-semibold">{lpSharePercentage.toFixed(4)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">LP Token</span>
                      <span className="text-white font-semibold">{parseFloat(formatEther(lpBalance!)).toFixed(6)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('remove')}
                    className="w-full mt-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold text-white transition-all"
                  >
                    管理流动性
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌊</div>
                  <h3 className="text-xl font-bold text-white mb-2">暂无流动性</h3>
                  <p className="text-gray-400 text-sm mb-4">添加流动性后，这里会显示你的流动性头寸</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-semibold text-white transition-all"
                  >
                    添加流动性
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Remove Liquidity Token A Selector */}
      {showRemoveASearch && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={() => setShowRemoveASearch(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>
            <div className="px-6 py-4">
              <h3 className="text-xl font-bold text-white mb-4">选择代币</h3>
              <input
                type="text"
                value={removeCustomAddressA}
                onChange={(e) => setRemoveCustomAddressA(e.target.value)}
                placeholder="搜索名称或粘贴地址"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 transition-colors"
              />
              
              {/* Searched Token Result */}
              {removeSearchedTokenA && (
                <div className="mb-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
                      {removeSearchedTokenA.symbol[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{removeSearchedTokenA.symbol}</div>
                      <div className="text-xs text-gray-400">{removeSearchedTokenA.name}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newToken = {
                        symbol: removeSearchedTokenA.symbol,
                        address: removeSearchedTokenA.address,
                        isNative: false,
                        logo: `https://tokens.pancakeswap.finance/images/${removeSearchedTokenA.address}.png`,
                      }
                      setRemoveTokenA(newToken)
                      setShowRemoveASearch(false)
                      setRemoveSearchedTokenA(null)
                      setRemoveCustomAddressA("")
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                  >
                    导入代币
                  </button>
                </div>
              )}
              
              <div className="space-y-2">
                {TOKENS.map(token => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      setRemoveTokenA(token)
                      setShowRemoveASearch(false)
                    }}
                    className="w-full px-4 py-3 rounded-xl text-left hover:bg-white/5 transition-colors flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        {token.logo && (
                          <img src={token.logo} alt={token.symbol} className="w-8 h-8 rounded-full absolute inset-0" />
                        )}
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold ${token.logo ? 'opacity-0' : ''}`}>
                          {token.symbol[0]}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">{token.symbol}</div>
                        <div className="text-xs text-gray-500">{token.isNative ? 'Native' : 'BEP-20'}</div>
                      </div>
                    </div>
                    {removeTokenA.symbol === token.symbol && (
                      <span className="text-blue-400 text-base">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove Liquidity Token B Selector */}
      {showRemoveBSearch && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" onClick={() => setShowRemoveBSearch(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>
            <div className="px-6 py-4">
              <h3 className="text-xl font-bold text-white mb-4">选择代币</h3>
              <input
                type="text"
                value={removeCustomAddressB}
                onChange={(e) => setRemoveCustomAddressB(e.target.value)}
                placeholder="搜索名称或粘贴地址"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 transition-colors"
              />
              
              {/* Searched Token Result */}
              {removeSearchedTokenB && (
                <div className="mb-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
                      {removeSearchedTokenB.symbol[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{removeSearchedTokenB.symbol}</div>
                      <div className="text-xs text-gray-400">{removeSearchedTokenB.name}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newToken = {
                        symbol: removeSearchedTokenB.symbol,
                        address: removeSearchedTokenB.address,
                        isNative: false,
                        logo: `https://tokens.pancakeswap.finance/images/${removeSearchedTokenB.address}.png`,
                      }
                      setRemoveTokenB(newToken)
                      setShowRemoveBSearch(false)
                      setRemoveSearchedTokenB(null)
                      setRemoveCustomAddressB("")
                    }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                  >
                    导入代币
                  </button>
                </div>
              )}
              
              <div className="space-y-2">
                {TOKENS.map(token => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      setRemoveTokenB(token)
                      setShowRemoveBSearch(false)
                    }}
                    className="w-full px-4 py-3 rounded-xl text-left hover:bg-white/5 transition-colors flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        {token.logo && (
                          <img src={token.logo} alt={token.symbol} className="w-8 h-8 rounded-full absolute inset-0" />
                        )}
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold ${token.logo ? 'opacity-0' : ''}`}>
                          {token.symbol[0]}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">{token.symbol}</div>
                        <div className="text-xs text-gray-500">{token.isNative ? 'Native' : 'BEP-20'}</div>
                      </div>
                    </div>
                    {removeTokenB.symbol === token.symbol && (
                      <span className="text-blue-400 text-base">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Slippage Settings Bottom Sheet for Add Liquidity */}
      {showSlippageModal && (
        <>
          <div 
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" 
            onClick={() => setShowSlippageModal(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>
            
            <div className="px-6 py-4">
              <h3 className="text-xl font-bold text-white mb-6">滑点设置</h3>
              
              {/* Preset Options */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[0.1, 0.5, 1.0, 2.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`py-3 rounded-xl font-semibold transition-all ${
                      slippage === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              
              {/* Custom Input */}
              <div className="mb-6">
                <label className="text-sm text-gray-400 mb-2 block">自定义滑点</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customSlippage || (slippage === 0.1 || slippage === 0.5 || slippage === 1.0 || slippage === 2.0 ? '' : slippage.toString())}
                    onChange={(e) => {
                      setCustomSlippage(e.target.value)
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val) && val > 0 && val <= 50) {
                        setSlippage(val)
                      }
                    }}
                    placeholder="输入滑点百分比"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              
              {/* Warning */}
              {slippage > 5 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ 高滑点可能导致较差的交易价格
                  </p>
                </div>
              )}
              
              {/* Confirm Button */}
              <button
                onClick={() => setShowSlippageModal(false)}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-white transition-all active:scale-[0.98]"
              >
                确认
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
