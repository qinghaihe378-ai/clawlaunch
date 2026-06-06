export const memeTokenFactoryAbi = [
  {
    type: "function",
    name: "allTokensLength",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "allTokens",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "tokenInfo",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [
      { type: "address", name: "token" },
      { type: "address", name: "market" },
      { type: "address", name: "creator" },
      { type: "uint40", name: "createdAt" },
      { type: "string", name: "description" },
      { type: "string", name: "logo" },
      { type: "string", name: "telegram" },
      { type: "string", name: "twitter" },
      { type: "string", name: "website" },
      { type: "uint8", name: "templateId" },
      { type: "uint16", name: "taxBps" },
      { type: "uint16", name: "burnShareBps" },
      { type: "uint16", name: "holderShareBps" },
      { type: "uint16", name: "liquidityShareBps" },
      { type: "uint16", name: "buybackShareBps" }
    ]
  }
] as const

export const erc20Abi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }]
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }]
  }
] as const

export const bondingCurveMarketAbi = [
  {
    type: "function",
    name: "migrated",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "targetRaise",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "quoteBuy",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "uint256" }, { type: "uint256" }]
  }
] as const
