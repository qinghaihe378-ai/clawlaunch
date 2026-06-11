import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const tokenAddress = "0x060351e671c1E1Fa79166bE83cf8733782a5cAD2";
  const factoryAddress = "0x6066e43888D8779322e9ab5dF151b26402807711";
  
  const factory = await ethers.getContractAt("MemeTokenFactory", factoryAddress);
  const tokenInfo = await factory.tokenInfo(tokenAddress);
  const marketAddress = tokenInfo.market;
  
  console.log("Token:", tokenAddress);
  console.log("Market:", marketAddress);
  console.log("Migrated:", tokenInfo.migrated);
  
  const market = await ethers.getContractAt("BondingCurveMarket", marketAddress);
  
  try {
    const quote = await market.quoteBuy(ethers.parseUnits("0.1", 18));
    console.log("\nquoteBuy(0.1 BNB):");
    console.log("  tokensOut:", quote[0].toString());
    console.log("  fee:", quote[1].toString());
    
    if (quote[0] > 0n) {
      const price = ethers.parseUnits("0.1", 18) / quote[0];
      console.log("  Price per token:", ethers.formatUnits(price, 18), "BNB");
    } else {
      console.log("  ❌ tokensOut is 0!");
    }
  } catch (error: any) {
    console.log("❌ quoteBuy failed:", error.message);
  }
}

main().catch(console.error);
