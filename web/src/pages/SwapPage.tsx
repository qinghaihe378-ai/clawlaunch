import { useState, useEffect, useMemo } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance, usePublicClient } from "wagmi"
import { formatEther, parseUnits, formatUnits, type Address, isAddress } from "viem"
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
    name: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: []
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
  },
  {
    name: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: []
  },
  {
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: []
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
const USDC = "0x8AC76a51cc950d9822D68b83Fe1Ad97B32Cd580d" as Address
const LIVE_REFETCH_MS = 4000
const PRICE_REFETCH_MS = 8000

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

type TokenOption = {
  symbol: string
  address: Address
  isNative?: boolean
  logo?: string
  decimals?: number
  name?: string
}

type RouteQuote = {
  path: Address[]
  amountsOut: bigint[]
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [delay, value])

  return debouncedValue
}

const TOKENS: TokenOption[] = [
  { symbol: "BNB", address: WBNB, isNative: true, decimals: 18, logo: "https://tokens.pancakeswap.finance/images/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c.png" },
  { symbol: "USDT", address: "0x55d398326f99059fF775485246999027B3197955" as Address, decimals: 18, logo: "https://tokens.pancakeswap.finance/images/0x55d398326f99059fF775485246999027B3197955.png" },
  { symbol: "BUSD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" as Address, decimals: 18, logo: "https://tokens.pancakeswap.finance/images/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56.png" },
  { symbol: "CAKE", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" as Address, decimals: 18, logo: "https://tokens.pancakeswap.finance/images/0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82.png" },
  { symbol: "ETH", address: "0x2170Ed0880ac9A755FD29B2688956BD959F933F8" as Address, decimals: 18, logo: "https://tokens.pancakeswap.finance/images/0x2170Ed0880ac9A755FD29B2688956BD959F933F8.png" },
]

export default function SwapPage() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient({ chainId: bsc.id })
  
  const [fromToken, setFromToken] = useState(TOKENS[0])
  const [toToken, setToToken] = useState(TOKENS[1])
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState(0.5)
  const [showSlippageModal, setShowSlippageModal] = useState(false)
  const [customSlippage, setCustomSlippage] = useState("")
  const [isApproved, setIsApproved] = useState(true)
  const [showFromSearch, setShowFromSearch] = useState(false)
  const [showToSearch, setShowToSearch] = useState(false)
  const [fromCustomAddress, setFromCustomAddress] = useState("")
  const [toCustomAddress, setToCustomAddress] = useState("")
  const [fromSearchedToken, setFromSearchedToken] = useState<TokenOption | null>(null)
  const [toSearchedToken, setToSearchedToken] = useState<TokenOption | null>(null)

  const sanitizeAmountInput = (value: string, decimals: number): string => {
    if (decimals !== 0) return value
    return value.replace(/[^\d]/g, "")
  }

  const parseAmountValue = (value: string, decimals: number): bigint | null => {
    if (!value) return null
    try {
      return parseUnits(value, decimals)
    } catch {
      return null
    }
  }

  const formatAmountForDisplay = (value: bigint, decimals: number, fractionDigits = 6): string => {
    const formatted = formatUnits(value, decimals)
    if (decimals === 0) return formatted
    return parseFloat(formatted).toFixed(fractionDigits)
  }

  // Get token decimals with timeout protection
  const { data: fromDecimals, error: fromDecimalsError } = useReadContract({
    address: isAddress(fromToken.address) && !fromToken.isNative ? fromToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!fromToken.address && !fromToken.isNative && isAddress(fromToken.address),
      retry: 2,
      retryDelay: 1000,
      gcTime: 5 * 60 * 1000, // Cache for 5 minutes
      staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
    }
  })

  // Log decimals query errors
  useEffect(() => {
    if (fromDecimalsError) {
      console.warn(`[SwapPage] Failed to query decimals for ${fromToken.symbol}:`, fromDecimalsError.message)
    }
  }, [fromDecimalsError, fromToken.symbol])

  const { data: toDecimals, error: toDecimalsError } = useReadContract({
    address: isAddress(toToken.address) && !toToken.isNative ? toToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: !!toToken.address && !toToken.isNative && isAddress(toToken.address),
      retry: 2,
      retryDelay: 1000,
      gcTime: 5 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
    }
  })

  // Log decimals query errors
  useEffect(() => {
    if (toDecimalsError) {
      console.warn(`[SwapPage] Failed to query decimals for ${toToken.symbol}:`, toDecimalsError.message)
    }
  }, [toDecimalsError, toToken.symbol])

  // PancakeSwap-style: get decimals with fallback to 18
  const getFromDecimals = (): number => {
    if (fromToken.isNative) return 18
    if (fromToken.decimals !== undefined) return fromToken.decimals
    return fromDecimals !== undefined ? Number(fromDecimals) : 18
  }
  
  const getToDecimals = (): number => {
    if (toToken.isNative) return 18
    if (toToken.decimals !== undefined) return toToken.decimals
    return toDecimals !== undefined ? Number(toDecimals) : 18
  }

  const fromTokenDecimals = getFromDecimals()
  const toTokenDecimals = getToDecimals()
  const debouncedFromAmount = useDebouncedValue(fromAmount, 250)
  const parsedFromAmount = useMemo(
    () => parseAmountValue(fromAmount, fromTokenDecimals),
    [fromAmount, fromTokenDecimals]
  )
  const debouncedParsedFromAmount = useMemo(
    () => parseAmountValue(debouncedFromAmount, fromTokenDecimals),
    [debouncedFromAmount, fromTokenDecimals]
  )
  const [routeQuote, setRouteQuote] = useState<RouteQuote | null>(null)
  const [isRouteLoading, setIsRouteLoading] = useState(false)

  const candidatePaths = useMemo(() => {
    const fromAddress = fromToken.address
    const toAddress = toToken.address
    const intermediaries = [
      WBNB,
      TOKENS.find((token) => token.symbol === "USDT")?.address,
      TOKENS.find((token) => token.symbol === "BUSD")?.address,
      USDC,
      TOKENS.find((token) => token.symbol === "CAKE")?.address,
    ].filter((address): address is Address => !!address)

    const pathMap = new Map<string, Address[]>()
    const addPath = (path: Address[]) => {
      if (path.length < 2) return
      if (path[0] === path[path.length - 1]) return
      if (new Set(path).size !== path.length) return
      pathMap.set(path.join("-"), path)
    }

    addPath([fromAddress, toAddress])
    for (const intermediate of intermediaries) {
      if (intermediate === fromAddress || intermediate === toAddress) continue
      addPath([fromAddress, intermediate, toAddress])
    }
    for (const firstIntermediate of intermediaries) {
      if (firstIntermediate === fromAddress || firstIntermediate === toAddress) continue
      for (const secondIntermediate of intermediaries) {
        if (secondIntermediate === fromAddress || secondIntermediate === toAddress || secondIntermediate === firstIntermediate) continue
        addPath([fromAddress, firstIntermediate, secondIntermediate, toAddress])
      }
    }

    return Array.from(pathMap.values())
  }, [fromToken.address, toToken.address])

  const amountsOut = routeQuote?.amountsOut ?? null
  const selectedPath = routeQuote?.path ?? null
  const selectedOutput = amountsOut && amountsOut.length > 0 ? amountsOut[amountsOut.length - 1] : 0n

  // Get best quote from PancakeSwap across common routing paths
  useEffect(() => {
    if (!publicClient || debouncedParsedFromAmount === null || debouncedParsedFromAmount <= 0n || fromToken.address === toToken.address) {
      setRouteQuote(null)
      setIsRouteLoading(false)
      return
    }

    let cancelled = false

    const fetchBestRoute = async () => {
      setIsRouteLoading(true)
      setRouteQuote(null)

      const results = await publicClient.multicall({
        contracts: candidatePaths.map((path) => ({
          address: ROUTER_ADDRESS,
          abi: ROUTER_ABI,
          functionName: "getAmountsOut",
          args: [debouncedParsedFromAmount, path],
        })),
        allowFailure: true,
      })

      if (cancelled) return

      const validRoutes = results.flatMap((result, index) => {
        if (result.status !== "success") return []

        const amounts = Array.from(result.result as readonly bigint[])
        const output = amounts[amounts.length - 1] ?? 0n
        if (output <= 0n) return []

        return [{
          path: candidatePaths[index],
          amountsOut: amounts,
          output,
        }]
      })
      validRoutes.sort((a, b) => {
        if (a.output === b.output) return a.path.length - b.path.length
        return a.output > b.output ? -1 : 1
      })

      if (validRoutes.length === 0) {
        setRouteQuote(null)
        setIsRouteLoading(false)
        return
      }

      setRouteQuote({
        path: validRoutes[0].path,
        amountsOut: validRoutes[0].amountsOut,
      })
      setIsRouteLoading(false)
    }

    fetchBestRoute().catch((error) => {
      if (cancelled) return
      console.warn(`[SwapPage] Failed to get quote for ${fromToken.symbol} → ${toToken.symbol}:`, error)
      setRouteQuote(null)
      setIsRouteLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [candidatePaths, debouncedParsedFromAmount, fromToken.address, fromToken.symbol, publicClient, toToken.address, toToken.symbol])

  // Get pair address for liquidity info (sort addresses alphabetically)
  const sortedPairAddresses = useMemo(
    () => [fromToken.address, toToken.address].sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1),
    [fromToken.address, toToken.address]
  )
  
  const { data: pairAddress } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: [sortedPairAddresses[0] as Address, sortedPairAddresses[1] as Address],
    query: {
      enabled: fromToken.address !== toToken.address && parsedFromAmount !== null && parsedFromAmount > 0n,
      refetchInterval: PRICE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
    }
  })

  // Get reserves for liquidity calculation
  const { data: reserves } = useReadContract({
    address: pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000' ? pairAddress as Address : undefined,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: {
      enabled: !!pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: PRICE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
    }
  })

  // Check allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: isAddress(fromToken.address) ? fromToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && fromAmount ? [address, ROUTER_ADDRESS] : undefined,
    query: {
      enabled: !!address && !fromToken.isNative && !!fromAmount && isAddress(fromToken.address),
      refetchInterval: LIVE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 15 * 1000,
    }
  })

  // Get balance for ERC20 tokens (From)
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: isAddress(fromToken.address) ? fromToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !fromToken.isNative && isAddress(fromToken.address),
      refetchInterval: LIVE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 15 * 1000,
    }
  })

  // Get BNB balance (From)
  const { data: bnbBalance, refetch: refetchBnbBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address && fromToken.isNative,
      refetchInterval: LIVE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 15 * 1000,
    }
  })

  // Use the appropriate balance for From token
  const displayBalance = fromToken.isNative ? bnbBalance?.value : balance

  // Get balance for ERC20 tokens (To)
  const { data: toBalance } = useReadContract({
    address: isAddress(toToken.address) ? toToken.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !toToken.isNative && isAddress(toToken.address),
      refetchInterval: LIVE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 15 * 1000,
    }
  })

  // Get BNB balance (To)
  const { data: toBnbBalance } = useBalance({
    address: address,
    query: {
      enabled: !!address && toToken.isNative,
      refetchInterval: LIVE_REFETCH_MS,
      refetchOnWindowFocus: true,
      staleTime: 15 * 1000,
    }
  })

  // Use the appropriate balance for To token
  // Update toAmount when quote changes
  useEffect(() => {
    if (selectedOutput > 0n) {
      try {
        setToAmount(formatAmountForDisplay(selectedOutput, toTokenDecimals))
      } catch (e) {
        console.error("格式化报价失败:", e)
        setToAmount("")
      }
    } else {
      setToAmount("")
    }
  }, [selectedOutput, toTokenDecimals])
  
  // Check for zero output and show warning
  const hasZeroOutput = parsedFromAmount !== null && parsedFromAmount > 0n && !isRouteLoading && selectedOutput === 0n

  // Calculate liquidity and price
  const liquidityInfo = useMemo(() => {
    if (!reserves || reserves.length < 2) return null
    
    try {
      const reserve0 = parseFloat(formatUnits(reserves[0], fromTokenDecimals))
      const reserve1 = parseFloat(formatUnits(reserves[1], toTokenDecimals))
      
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
    } catch (e) {
      console.error("流动性计算失败:", e)
      return null
    }
  }, [reserves, fromTokenDecimals, toTokenDecimals])

  // Check approval status
  useEffect(() => {
    if (fromToken.isNative) {
      setIsApproved(true)
    } else if (allowance && fromAmount) {
      try {
        const needed = parseAmountValue(fromAmount, fromTokenDecimals)
        setIsApproved(needed !== null && allowance >= needed)
      } catch (e) {
        console.error("授权检查失败:", e)
        setIsApproved(false)
      }
    } else {
      // Reset to false when token changes or no amount entered
      setIsApproved(false)
    }
  }, [allowance, fromAmount, fromToken.address, fromToken.isNative, fromTokenDecimals])

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

  const { data: fromSearchDecimals } = useReadContract({
    address: isAddress(fromCustomAddress) ? fromCustomAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: isAddress(fromCustomAddress),
    }
  })

  useEffect(() => {
    if (fromTokenSymbol && fromTokenName && fromSearchDecimals !== undefined && isAddress(fromCustomAddress)) {
      setFromSearchedToken({
        symbol: String(fromTokenSymbol),
        name: String(fromTokenName),
        address: fromCustomAddress as Address,
        decimals: Number(fromSearchDecimals),
      })
    } else {
      setFromSearchedToken(null)
    }
  }, [fromSearchDecimals, fromTokenSymbol, fromTokenName, fromCustomAddress])

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

  const { data: toSearchDecimals } = useReadContract({
    address: isAddress(toCustomAddress) ? toCustomAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: isAddress(toCustomAddress),
    }
  })

  useEffect(() => {
    if (toTokenSymbol && toTokenName && toSearchDecimals !== undefined && isAddress(toCustomAddress)) {
      setToSearchedToken({
        symbol: String(toTokenSymbol),
        name: String(toTokenName),
        address: toCustomAddress as Address,
        decimals: Number(toSearchDecimals),
      })
    } else {
      setToSearchedToken(null)
    }
  }, [toSearchDecimals, toTokenSymbol, toTokenName, toCustomAddress])


  // Approve token
  const { writeContract: approve, isPending: isApproving, data: approveTxHash } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    timeout: 60000,
  })
  
  // Execute swap
  const { writeContract: swap, isPending: isSwapping, data: txHash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
    timeout: 60000, // 60 second timeout
  })

  // Check transaction status and show error if reverted
  useEffect(() => {
    if (receipt && receipt.status === 'reverted') {
      console.error('❌ 交易失败 (Reverted)')
      console.error('交易哈希:', txHash)
    }
  }, [fromToken.address, fromToken.symbol, receipt, toToken.address, toToken.symbol, txHash])

  // Check for transaction errors or timeout
  useEffect(() => {
    if (isTxError) {
      console.error('❌ 交易错误:', txError)
    }
  }, [allowance, balance, fromAmount, fromToken, isTxError, toAmount, toToken, txError])

  // Refetch allowance after approval transaction is confirmed
  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance()
    }
  }, [isApproveConfirmed, refetchAllowance])

  // Refetch balance after swap transaction is confirmed
  useEffect(() => {
    if (isConfirmed && !isSwapping) {
      if (fromToken.isNative) {
        refetchBnbBalance()
      } else {
        refetchBalance()
      }
    }
  }, [isConfirmed, isSwapping, fromToken.isNative, refetchBalance, refetchBnbBalance])

  const handleApprove = () => {
    if (!address || !fromAmount) return

    // For approval, use max uint256 to avoid insufficient allowance issues
    // This is safe because approve only allows the router to spend, not take
    const maxApproval = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935") // 2^256 - 1

    approve({
      address: fromToken.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ROUTER_ADDRESS, maxApproval],
    })
  }

  const handleSwap = () => {
    if (!address || !fromAmount || !toAmount) {
      return
    }
    
    if (!selectedPath || selectedOutput === 0n) {
      console.error('❌ 交易被阻止: 未找到可用卖出路由')
      alert(`⚠️ 无法执行交易！\n\n原因：当前常用路由都无法卖出 ${fromAmount} ${fromToken.symbol}\n\n解决方案：\n- 增加卖出数量\n- 或尝试更高流动性的目标币\n- 或该代币当前没有可用卖出路径`)
      return
    }
    
    const fromDec = getFromDecimals()
    const toDec = getToDecimals()
    const amountInValue = parseAmountValue(fromAmount, fromDec)

    if (amountInValue === null) {
      alert(fromDec === 0 ? `该代币是 0 精度，只能输入整数数量` : `输入金额格式不正确`)
      return
    }

    // Additional checks for selling tokens
    if (!fromToken.isNative) {
      // Check allowance
      if (allowance !== undefined) {
        if (allowance < amountInValue) {
          alert(`授权额度不足！\n\n需要: ${fromAmount} ${fromToken.symbol}\n已授权: ${formatUnits(allowance, fromDec)} ${fromToken.symbol}\n\n请先点击"授权"按钮`)
          return
        }
      }
      
      // Check balance
      if (balance !== undefined) {
        if (balance < amountInValue) {
          alert(`余额不足！\n\n需要: ${fromAmount} ${fromToken.symbol}\n当前余额: ${formattedBalance} ${fromToken.symbol}`)
          return
        }
      }
    }
    
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)
      const amountIn = amountInValue
      
      // Calculate amountOutMin with slippage using BigInt to avoid precision loss
      const fallbackAmountOut = parseAmountValue(toAmount, toDec)
      if (!amountsOut && fallbackAmountOut === null) {
        alert(toDec === 0 ? `目标代币是 0 精度，预估输出必须是整数` : `预估输出金额格式不正确`)
        return
      }
      const amountsOutValue = selectedOutput > 0n ? selectedOutput : (fallbackAmountOut ?? 0n)

      const slippageBps = BigInt(Math.floor(slippage * 100)) // Convert to basis points (e.g., 0.5% = 50 bps)
      const shouldUseZeroMinOut = !fromToken.isNative && fromDec === 0
      const amountOutMin = shouldUseZeroMinOut
        ? 0n
        : amountsOutValue * (BigInt(10000) - slippageBps) / BigInt(10000)

      // IMPORTANT: Path must be in the correct order for the swap direction
      // For sell (token -> BNB): [tokenAddress, WBNB]
      // For buy (BNB -> token): [WBNB, tokenAddress]
      const path = selectedPath
      if (fromToken.isNative) {
        swap({
          address: ROUTER_ADDRESS,
          abi: ROUTER_ABI,
          functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
          args: [amountOutMin, path, address, deadline],
          value: amountIn,
          gas: BigInt(600000), // Higher gas for tax tokens
        })
      } else if (toToken.isNative) {
        swap({
          address: ROUTER_ADDRESS,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens",
          args: [amountIn, amountOutMin, path, address, deadline],
          gas: BigInt(800000), // Much higher gas for selling tax tokens
        })
      } else {
        swap({
          address: ROUTER_ADDRESS,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
          args: [amountIn, amountOutMin, path, address, deadline],
          gas: BigInt(800000), // Much higher gas for tax tokens
        })
      }
    } catch (error) {
      console.error("Swap 调用失败:", error)
    }
  }

  const handleSwitchTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
    // Reset approval status when switching tokens
    setIsApproved(false)
  }

  const isOnBSC = chainId === bsc.id
  const formattedBalance = displayBalance ? formatUnits(displayBalance, fromTokenDecimals) : "0"
  
  // Check if user has enough balance (using BigInt for precision)
  const hasEnoughBalance = (() => {
    if (fromToken.isNative) return true // BNB balance check would need separate logic
    if (!balance || !fromAmount) return true
    try {
      return parsedFromAmount !== null && balance >= parsedFromAmount
    } catch (e) {
      console.error("余额检查失败:", e)
      return false
    }
  })()

  return (
    <div className="w-full flex justify-center pt-4 p-3">
        <div className="w-full max-w-md bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-2xl border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
            <h2 className="text-lg font-bold text-white tracking-tight">Swap</h2>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
          
          <div className="p-3 space-y-2">
            {/* From Token Card */}
            <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all group">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">From</span>
                {address && !fromToken.isNative && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setFromAmount(formattedBalance)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      最大
                    </button>
                    <span className="text-[10px] text-white font-bold">
                      余额: {fromTokenDecimals === 0 ? formattedBalance : parseFloat(formattedBalance || "0").toFixed(4)}
                    </span>
                  </div>
                )}
                {address && fromToken.isNative && bnbBalance && (
                  <span className="text-[10px] text-white font-bold">
                    余额: {parseFloat(formatEther(bnbBalance.value)).toFixed(4)}
                  </span>
                )}
                {address && fromToken.isNative && !bnbBalance && (
                  <span className="text-[10px] text-white font-bold">
                    余额: 0.0000
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="number"
                  value={fromAmount}
                  step={fromTokenDecimals === 0 ? "1" : "any"}
                  onChange={(e) => setFromAmount(sanitizeAmountInput(e.target.value, fromTokenDecimals))}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-light text-white placeholder-gray-500 focus:outline-none min-w-0"
                />
                <button
                  onClick={() => {
                    setShowFromSearch(!showFromSearch)
                    setShowToSearch(false)
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap text-xs"
                >
                  <div className="relative w-5 h-5 flex-shrink-0">
                    {fromToken.logo ? (
                      <>
                        <img 
                          src={fromToken.logo} 
                          alt={fromToken.symbol} 
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              const fallback = parent.querySelector('.token-fallback') as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }
                          }}
                        />
                        <div className="token-fallback w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold" style={{display: 'none'}}>
                          {fromToken.symbol[0]}
                        </div>
                      </>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                        {fromToken.symbol[0]}
                      </div>
                    )}
                  </div>
                  <span>{fromToken.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-70">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>

              {/* Token Selector Dropdown */}
              {showFromSearch && (
                <>
                  <div 
                    className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" 
                    onClick={() => setShowFromSearch(false)}
                  />
                  <div className="fixed bottom-0 left-0 right-0 z-[201] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
                    {/* Handle Bar */}
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>
                    
                    <div className="px-6 py-4">
                      <h3 className="text-xl font-bold text-white mb-4">选择代币</h3>
                      
                      <input
                        type="text"
                        value={fromCustomAddress}
                        onChange={(e) => setFromCustomAddress(e.target.value)}
                        placeholder="搜索名称或粘贴地址"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 transition-colors"
                      />

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
                                decimals: fromSearchedToken.decimals,
                                logo: `https://tokens.pancakeswap.finance/images/${fromSearchedToken.address}.png`,
                              }
                              setFromToken(newToken)
                              setShowFromSearch(false)
                              setFromAmount("")
                              setFromSearchedToken(null)
                              setFromCustomAddress("")
                              setIsApproved(false)
                            }}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                          >
                            导入代币
                          </button>
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-3 font-medium">常用代币</div>
                        <div className="grid grid-cols-4 gap-2">
                          {TOKENS.slice(0, 4).map(token => (
                            <button
                              key={token.symbol}
                              onClick={() => {
                                setFromToken(token)
                                setShowFromSearch(false)
                                setFromAmount("")
                                setIsApproved(false)
                              }}
                              className="px-3 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors text-center"
                            >
                              {token.symbol}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {TOKENS.map(token => (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              setFromToken(token)
                              setShowFromSearch(false)
                              setFromAmount("")
                              setIsApproved(false)
                            }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-white/5 transition-colors flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-8 h-8 flex-shrink-0">
                                {token.logo ? (
                                  <>
                                    <img 
                                      src={token.logo} 
                                      alt={token.symbol} 
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          const fallback = parent.querySelector('.token-fallback-list') as HTMLElement
                                          if (fallback) fallback.style.display = 'flex'
                                        }
                                      }}
                                    />
                                    <div className="token-fallback-list w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold" style={{display: 'none'}}>
                                      {token.symbol[0]}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                    {token.symbol[0]}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{token.symbol}</div>
                                <div className="text-xs text-gray-500">{token.isNative ? 'Native' : 'BEP-20'}</div>
                              </div>
                            </div>
                            {fromToken.symbol === token.symbol && (
                              <span className="text-blue-400 text-base">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
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
                <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">To</span>
                {address && !toToken.isNative && toBalance !== undefined && (
                  <span className="text-[10px] text-white font-bold">
                    余额: {toTokenDecimals === 0 ? formatUnits(toBalance, toTokenDecimals) : parseFloat(formatUnits(toBalance, toTokenDecimals)).toFixed(4)}
                  </span>
                )}
                {address && toToken.isNative && toBnbBalance && (
                  <span className="text-[10px] text-white font-bold">
                    余额: {parseFloat(formatEther(toBnbBalance.value)).toFixed(4)}
                  </span>
                )}
                {address && toToken.isNative && !toBnbBalance && (
                  <span className="text-[10px] text-white font-bold">
                    余额: 0.0000
                  </span>
                )}
                {!address && toAmount && <span className="text-[10px] text-blue-400 font-medium">≈ {toTokenDecimals === 0 ? toAmount : parseFloat(toAmount).toFixed(6)} {toToken.symbol}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl font-light text-white placeholder-gray-500 focus:outline-none min-w-0"
                />
                <button
                  onClick={() => {
                    setShowToSearch(!showToSearch)
                    setShowFromSearch(false)
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 active:scale-95 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-all border border-white/10 whitespace-nowrap text-xs"
                >
                  <div className="relative w-5 h-5 flex-shrink-0">
                    {toToken.logo ? (
                      <>
                        <img 
                          src={toToken.logo} 
                          alt={toToken.symbol} 
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              const fallback = parent.querySelector('.token-fallback-to') as HTMLElement
                              if (fallback) fallback.style.display = 'flex'
                            }
                          }}
                        />
                        <div className="token-fallback-to w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold" style={{display: 'none'}}>
                          {toToken.symbol[0]}
                        </div>
                      </>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">
                        {toToken.symbol[0]}
                      </div>
                    )}
                  </div>
                  <span>{toToken.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-70">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
              </div>

              {/* Token Selector Dropdown */}
              {showToSearch && (
                <>
                  <div 
                    className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm" 
                    onClick={() => setShowToSearch(false)}
                  />
                  <div className="fixed bottom-0 left-0 right-0 z-[201] bg-gradient-to-b from-gray-900 via-black to-gray-900 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
                    {/* Handle Bar */}
                    <div className="flex justify-center pt-3 pb-2">
                      <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                    </div>
                    
                    <div className="px-6 py-4">
                      <h3 className="text-xl font-bold text-white mb-4">选择代币</h3>
                      
                      <input
                        type="text"
                        value={toCustomAddress}
                        onChange={(e) => setToCustomAddress(e.target.value)}
                        placeholder="搜索名称或粘贴地址"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 transition-colors"
                      />

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
                                decimals: toSearchedToken.decimals,
                                logo: `https://tokens.pancakeswap.finance/images/${toSearchedToken.address}.png`,
                              }
                              setToToken(newToken)
                              setShowToSearch(false)
                              setToSearchedToken(null)
                              setToCustomAddress("")
                            }}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-sm font-semibold text-white transition-all"
                          >
                            导入代币
                          </button>
                        </div>
                      )}

                      <div className="mb-4">
                        <div className="text-sm text-gray-400 mb-3 font-medium">常用代币</div>
                        <div className="grid grid-cols-4 gap-2">
                          {TOKENS.slice(0, 4).map(token => (
                            <button
                              key={token.symbol}
                              onClick={() => {
                                setToToken(token)
                                setShowToSearch(false)
                              }}
                              className="px-3 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors text-center"
                            >
                              {token.symbol}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {TOKENS.map(token => (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              setToToken(token)
                              setShowToSearch(false)
                            }}
                            className="w-full px-4 py-3 rounded-xl text-left hover:bg-white/5 transition-colors flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative w-8 h-8 flex-shrink-0">
                                {token.logo ? (
                                  <>
                                    <img 
                                      src={token.logo} 
                                      alt={token.symbol} 
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          const fallback = parent.querySelector('.token-fallback-list') as HTMLElement
                                          if (fallback) fallback.style.display = 'flex'
                                        }
                                      }}
                                    />
                                    <div className="token-fallback-list w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold" style={{display: 'none'}}>
                                      {token.symbol[0]}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                    {token.symbol[0]}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{token.symbol}</div>
                                <div className="text-xs text-gray-500">{token.isNative ? 'Native' : 'BEP-20'}</div>
                              </div>
                            </div>
                            {toToken.symbol === token.symbol && (
                              <span className="text-blue-400 text-base">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

          {/* Status Messages */}
          {(isApproving || isApproveConfirming) && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-sm text-blue-400 font-medium">⏳ 授权中...</span>
            </div>
          )}

          {isSwapping && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-sm text-yellow-400 font-medium">⏳ 等待确认...</span>
            </div>
          )}

          {isConfirming && txHash && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-sm text-purple-400 font-medium mb-2 block">⏳ 交易中...</span>
              <a 
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-300 hover:text-purple-200 underline"
              >
                在 BSCScan 上查看
              </a>
            </div>
          )}

          {/* Liquidity Info */}
          {liquidityInfo && parsedFromAmount !== null && parsedFromAmount > 0n && (
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl p-3 border border-white/5 space-y-2">
              {/* Zero Output Warning */}
              {hasZeroOutput && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-2">
                  <p className="text-red-400 text-xs font-semibold mb-1">⚠️ 警告</p>
                  <p className="text-red-300 text-xs">
                    {fromAmount} {fromToken.symbol} 当前在常用路由里没有可用输出
                  </p>
                  <p className="text-red-300 text-xs mt-1">
                    请增加卖出数量、切换目标币，或检查流动性路径
                  </p>
                </div>
              )}
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">价格</span>
                <span className="text-white font-medium">
                  {selectedOutput > 0n ? (
                    `1 ${fromToken.symbol} ≈ ${formatAmountForDisplay(selectedOutput, toTokenDecimals)} ${toToken.symbol}`
                  ) : (
                    `1 ${fromToken.symbol} ≈ ${liquidityInfo.price.toFixed(6)} ${toToken.symbol}`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">流动性</span>
                <span className="text-white font-medium">
                  ${liquidityInfo.liquidity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-300">滑点</span>
                <button 
                  onClick={() => setShowSlippageModal(true)}
                  className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
                >
                  {slippage}%
                </button>
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
          ) : parsedFromAmount === null ? (
            <button
              disabled
              className="w-full py-3.5 bg-red-500/20 rounded-xl font-bold text-red-400 cursor-not-allowed border border-red-500/30 text-sm"
            >
              {fromTokenDecimals === 0 ? "0 精度代币只能输入整数" : "金额格式不正确"}
            </button>
          ) : !hasEnoughBalance ? (
            <button
              disabled
              className="w-full py-3.5 bg-red-500/20 rounded-xl font-bold text-red-400 cursor-not-allowed border border-red-500/30 text-sm"
            >
              余额不足
            </button>
          ) : !isApproved && !fromToken.isNative ? (
            <button
              onClick={handleApprove}
              disabled={isApproving || isApproveConfirming}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl font-bold text-white transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 active:scale-[0.98] text-sm"
            >
              {isApproving || isApproveConfirming ? "授权中..." : `授权 ${fromToken.symbol}`}
            </button>
          ) : hasZeroOutput ? (
            <button
              disabled
              className="w-full py-3.5 bg-red-500/20 rounded-xl font-bold text-red-400 cursor-not-allowed border border-red-500/30 text-sm"
            >
              ⚠️ 价值太低，无法交易
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

      {/* Slippage Settings Bottom Sheet */}
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
              <div className="grid grid-cols-5 gap-3 mb-6">
                {[0.1, 0.5, 1.0, 2.0, 5.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSlippage(value)
                      setCustomSlippage('')
                    }}
                    className={`py-3 rounded-xl font-semibold transition-all ${
                      slippage === value && !customSlippage
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
                    value={customSlippage !== '' ? customSlippage : (slippage === 0.1 || slippage === 0.5 || slippage === 1.0 || slippage === 2.0 || slippage === 5.0 ? '' : slippage.toString())}
                    onChange={(e) => {
                      const inputVal = e.target.value
                      setCustomSlippage(inputVal)
                      const val = parseFloat(inputVal)
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
