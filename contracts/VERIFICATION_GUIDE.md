# 代币合约验证指南

## 📋 概述

本项目支持两种代币合约自动验证方式：
1. **Sourcify 自动验证**（推荐）- 部署时自动上传到 Sourcify
2. **BSCScan 手动验证** - 使用脚本手动验证已部署的代币

---

## 🔧 配置说明

### 1. Sourcify 自动验证（已启用）

在 `hardhat.config.ts` 中已配置：
```typescript
sourcify: {
  enabled: true
}
```

**优点**：
- ✅ 完全自动化，无需手动操作
- ✅ 支持所有 EVM 链
- ✅ 开源且去中心化

**注意**：Sourcify 验证的合约在 BSCScan 上会显示 "Partial Match" 标记

---

### 2. BSCScan 手动验证脚本

#### 脚本 1: 验证最新创建的代币

```bash
# 自动检测最近创建的代币并验证
npx hardhat run scripts/verifyLatestToken.ts --network bsc

# 或者指定交易哈希
npx hardhat run scripts/verifyLatestToken.ts --network bsc 0x1234567890abcdef...
```

#### 脚本 2: 验证指定代币地址

```bash
# 无税代币 (templateId = 0)
npx hardhat run scripts/verifyToken.ts --network bsc <tokenAddress> 0

# 有税代币 (templateId = 1)
npx hardhat run scripts/verifyToken.ts --network bsc <tokenAddress> 1
```

---

## 🚀 使用流程

### 创建代币后自动验证

1. **通过前端或脚本创建代币**
2. **等待 1-2 分钟**（让 BSCScan 索引交易）
3. **运行验证脚本**：
   ```bash
   cd contracts
   npx hardhat run scripts/verifyLatestToken.ts --network bsc
   ```

### 批量验证历史代币

```bash
# 获取最近的 TokenCreated 事件
npx hardhat run scripts/verifyLatestToken.ts --network bsc

# 对每个代币重复执行，或使用循环脚本
```

---

## 📝 示例输出

```
开始验证最新创建的代币合约
Factory 地址: 0xc411364F32f01fe8b281c0510B09d9d1943eC1F2

查询最近的 TokenCreated 事件...
  代币地址: 0xABC123...
  模板 ID: 1
  区块号: 12345678

开始验证合约...
合约类型: 有税(MemeTokenTax)
合约路径: contracts/MemeTokenTax.sol:MemeTokenTax

✅ 合约验证成功!
   地址: 0xABC123...
   BSCScan: https://bscscan.com/address/0xABC123...#code
```

---

## ⚠️ 常见问题

### Q1: 验证失败 "Contract source code not found"
**原因**: 合约可能已经通过 Sourcify 验证  
**解决**: 检查 BSCScan 上的 "Other Settings" -> "Contract Source Code Verified (Sourcify)"

### Q2: 验证失败 "Already Verified"
**说明**: 合约已经验证过了，无需重复操作

### Q3: 验证失败 "Unable to match contract"
**原因**: 
- 编译器版本不匹配
- 优化器设置不同
- 构造函数参数错误

**解决**: 确保 `hardhat.config.ts` 中的配置与部署时一致

### Q4: 为什么无税代币能验证，有税代币不能？
**原因**: 两个合约的代码结构不同，需要分别指定正确的合约路径
- 无税: `contracts/MemeToken.sol:MemeToken`
- 有税: `contracts/MemeTokenTax.sol:MemeTokenTax`

---

## 🔗 相关链接

- **BSCScan**: https://bscscan.com
- **Sourcify**: https://sourcify.dev
- **Factory 合约**: `0xc411364F32f01fe8b281c0510B09d9d1943eC1F2`
- **TaxDeployer**: `0x86B6dDa4CeB1aDC71bBB68671e329b5F7DcE658e`

---

## 💡 最佳实践

1. **每次创建代币后立即验证**（等待 1-2 分钟）
2. **保存交易哈希**，方便后续验证
3. **定期检查未验证的代币**
4. **在前端添加验证按钮**，让用户一键验证

---

## 🎯 下一步优化

可以在前端添加"验证合约"按钮：
1. 用户点击后调用后端 API
2. 后端执行 `verifyLatestToken.ts` 脚本
3. 返回验证结果给用户

这样用户体验会更好！
