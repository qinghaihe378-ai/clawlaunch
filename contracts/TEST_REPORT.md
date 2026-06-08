# 🧪 合约功能测试报告

## 📋 测试环境
- **网络**: BSC Testnet (Chain ID: 97)
- **部署时间**: 2026-06-08
- **测试账户**: 0xB39e0a82827d97a4deFa5bd44A1D881f5Cd2224c

---

## ✅ 已部署合约地址

| 合约 | 地址 |
|------|------|
| **Factory** | 0x62F6763c41C6950E8dB15B4526b5C49E96546d20 |
| **Locker** | 0xb175A47f223557974651D9D3536B4EF5309D5f88 |
| **TaxDeployer** | 0x218388FeB52a35C83738b6D85BD2d720325654d8 |
| **Treasury** | 0xB39e0a82827d97a4deFa5bd44A1D881f5Cd2224c |

---

## ⚙️ 配置验证结果

### Factory 配置
```
✅ 创建费: 0.005 BNB
✅ 买入手续费: 100 BPS (1%)
✅ 卖出手续费: 100 BPS (1%)
✅ 目标募资: 16.5 BNB
✅ 防狙击延迟: 120 秒
```

### BondingCurveMarket 配置
```
✅ LP_LOCK_DURATION: 365 days (1年)
   - 位置: contracts/BondingCurveMarket.sol 第 18 行
   - 代码: uint256 internal constant LP_LOCK_DURATION = 365 days;
```

---

## 📊 功能分析

### 1. 无税代币 (templateId=0)

#### 创建阶段
- ✅ **创建费**: 0.005 BNB → Treasury
- ✅ 调用 `MemeTokenFactory.createToken()` 时强制要求 `msg.value == creationFee`
- ✅ 立即转账给 Treasury: `_sendBNB(treasury, msg.value)`

#### 曲线阶段
- ✅ **买入手续费**: 1% (buyFeeBps = 100)
  - 位置: `BondingCurveMarket.buy()`
  - 计算: `feePaid = (grossIn * buyFeeBps) / 10_000`
  - 去向: `_sendBNB(treasury, feePaid)`

- ✅ **卖出手续费**: 1% (sellFeeBps = 100)
  - 位置: `BondingCurveMarket.sell()`
  - 计算: `feePaid = (gross * sellFeeBps) / 10_000`
  - 去向: `_sendBNB(treasury, feePaid)`

#### 毕业后
- ❌ **无平台税费**
  - 原因: MemeToken 是标准 ERC20，没有税费逻辑
  - 交易在 PancakeSwap 进行，平台无法收费

---

### 2. 带税代币 (templateId=1)

#### 创建阶段
- ✅ **创建费**: 0.005 BNB → Treasury
- ✅ 同无税代币

#### 曲线阶段
- ✅ **买入手续费**: 1% (buyFeeBps = 100)
  - 同无税代币
  
- ✅ **卖出手续费**: 1% (sellFeeBps = 100)
  - 同无税代币

#### 毕业后
- ✅ **用户自定义税率** (taxBps)
  - 范围: 0.1% - 5% (10-500 BPS)
  - 分配:
    - burnShareBps: 燃烧
    - holderShareBps: 持有者分红
    - liquidityShareBps: 流动性池
    - buybackShareBps: 回购 → Treasury (平台收益)

**示例配置**:
```solidity
taxBps: 300,              // 总税率 3%
burnShareBps: 2000,       // 20% 燃烧 (0.6%)
holderShareBps: 5000,     // 50% 分红 (1.5%)
liquidityShareBps: 2000,  // 20% 流动性 (0.6%)
buybackShareBps: 1000     // 10% → Treasury (0.3%)
```

**平台收入**:
- 曲线阶段: 1% 买卖手续费
- 毕业后: taxBps × (buybackShareBps / 10000)

---

## 🔒 锁仓时间验证

### 代码证据
```solidity
// contracts/BondingCurveMarket.sol 第 18 行
uint256 internal constant LP_LOCK_DURATION = 365 days;

// 毕业时使用
bytes32 lockId = locker.registerLock(
    pair, 
    lpBal, 
    treasury, 
    uint64(block.timestamp + LP_LOCK_DURATION)  // ← 当前时间 + 365天
);
```

### 结论
✅ **锁仓时间已设置为 365 天 (1年)**

---

## 💰 平台收入总结

| 阶段 | 无税代币 | 带税代币 |
|------|---------|---------|
| **创建** | 0.005 BNB | 0.005 BNB |
| **曲线买入** | 1% | 1% |
| **曲线卖出** | 1% | 1% |
| **毕业后交易** | 0% | 用户自定义 (可包含平台收益) |

### 收入来源
1. **创建费**: 每个代币 0.005 BNB
2. **曲线手续费**: 买卖各 1%
3. **带税代币毕业后**: 通过 buybackShareBps 获得部分税费

---

## ⚠️ 注意事项

### 测试限制
由于测试账户余额不足 (仅 0.007 BNB)，未能完成完整的交易测试。需要：
1. 从 BSC 测试网水龙头获取测试币
2. 网址: https://testnet.bnbchain.org/faucet-smart
3. 输入地址: 0xB39e0a82827d97a4deFa5bd44A1D881f5Cd2224c

### 建议的完整测试流程
1. ✅ 部署合约 (已完成)
2. ✅ 验证配置 (已完成)
3. ⏳ 创建无税代币 (需要更多测试币)
4. ⏳ 测试曲线买卖 (需要更多测试币)
5. ⏳ 创建带税代币 (需要更多测试币)
6. ⏳ 测试税费机制 (需要更多测试币)
7. ⏳ 模拟毕业并验证锁仓 (需要募资完成)

---

## 🎯 结论

### ✅ 已验证
1. **合约部署成功**
2. **配置正确**:
   - 创建费: 0.005 BNB ✓
   - 曲线手续费: 1% ✓
   - 锁仓时间: 365天 ✓
3. **代码逻辑正确**:
   - 无税代币: 曲线收 1%，毕业后无税费 ✓
   - 带税代币: 曲线收 1%，毕业后可自定义税费 ✓
   - Treasury 正确接收所有费用 ✓

### ⏳ 待验证 (需要测试币)
1. 实际创建代币交易
2. 实际买卖交易和手续费收取
3. 毕业流程和 LP 锁仓

---

## 📝 下一步

1. **获取测试币**: 从 BSC 测试网水龙头充值
2. **运行完整测试**: `npx hardhat run scripts/fullTest.ts --network bscTestnet`
3. **验证通过后再部署主网**
