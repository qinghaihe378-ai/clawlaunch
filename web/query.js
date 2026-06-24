import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

const client = createPublicClient({
  chain: bsc,
  transport: http()
});

const abi = [
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }
];

async function main() {
  const address = "0x054d5BD23635689576E8F1Fb7120A85365411111";
  const symbol = await client.readContract({ address, abi, functionName: 'symbol' });
  const decimals = await client.readContract({ address, abi, functionName: 'decimals' });
  const name = await client.readContract({ address, abi, functionName: 'name' });
  console.log(`Symbol: ${symbol}, Decimals: ${decimals}, Name: ${name}`);
}

main().catch(console.error);
