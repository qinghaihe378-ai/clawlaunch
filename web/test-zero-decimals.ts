import { parseUnits, formatUnits } from 'viem'

console.log('=== 测试 0 精度代币的计算 ===\n')

// 模拟 0 精度代币
const decimals = 0

// 用户输入 "10" 个代币
const userInput = '10'

console.log('用户输入:', userInput)
console.log('代币精度:', decimals)

// 转换为最小单位
const amountIn = parseUnits(userInput, decimals)
console.log('\nparseUnits("10", 0):', amountIn.toString())
console.log('类型:', typeof amountIn)

// 格式化显示
const formatted = formatUnits(amountIn, decimals)
console.log('\nformatUnits(amountIn, 0):', formatted)

// 测试大数
const largeAmount = parseUnits('1000000', 0)
console.log('\nparseUnits("1000000", 0):', largeAmount.toString())

// 测试小数（应该会被截断）
try {
  const decimalAmount = parseUnits('10.5', 0)
  console.log('\nparseUnits("10.5", 0):', decimalAmount.toString())
} catch (error: any) {
  console.error('\n❌ parseUnits("10.5", 0) 失败:', error.message)
}

console.log('\n=== 对比 18 精度代币 ===\n')

const decimals18 = 18
const amountIn18 = parseUnits('10', decimals18)
console.log('parseUnits("10", 18):', amountIn18.toString())
console.log('formatUnits(amountIn18, 18):', formatUnits(amountIn18, 18))

console.log('\n=== 结论 ===')
console.log('0 精度代币:')
console.log('- parseUnits("10", 0) = 10 (直接返回整数)')
console.log('- 不支持小数输入')
console.log('- BigInt 比较完全准确')
