import hre from "hardhat"
const { ethers } = hre

async function main() {
  console.log("========================================")
  console.log("部署测试代币到 BSC Testnet")
  console.log("========================================\n")

  const [deployer] = await ethers.getSigners()
  console.log("部署者地址:", deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("BNB 余额:", ethers.formatEther(balance), "\n")

  // 部署三个不同精度的代币
  const tokens = [
    { name: "Test Token 0", symbol: "TT0", decimals: 0, supply: 1000000 },
    { name: "Test Token 9", symbol: "TT9", decimals: 9, supply: 1000000 },
    { name: "Test Token 18", symbol: "TT18", decimals: 18, supply: 1000000 },
  ]

  const deployedAddresses: string[] = []

  for (const token of tokens) {
    console.log(`\n部署 ${token.name} (${token.symbol})...`)
    console.log(`精度: ${token.decimals}`)
    console.log(`初始供应: ${token.supply}`)

    const TestToken = await ethers.getContractFactory("TestToken")
    const contract = await TestToken.deploy(
      token.name,
      token.symbol,
      token.decimals,
      token.supply
    )

    await contract.waitForDeployment()
    const address = await contract.getAddress()

    console.log(`✅ 部署成功! 地址: ${address}`)
    deployedAddresses.push(address)
  }

  console.log("\n========================================")
  console.log("所有代币部署完成!")
  console.log("========================================")
  console.log("\n代币地址:")
  console.log(`0 精度: ${deployedAddresses[0]}`)
  console.log(`9 精度: ${deployedAddresses[1]}`)
  console.log(`18 精度: ${deployedAddresses[2]}`)
  console.log("\n请在测试网上使用这些地址进行交易测试")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
