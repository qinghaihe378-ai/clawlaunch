# 自动验证脚本使用指南

## 功能说明

`autoVerifyTokens.ts` 是一个监听器脚本，用于自动监听新代币的创建事件，并在代币创建后自动在 BSCScan 上进行合约验证（开源）。

## 工作原理

1. **监听事件**：脚本连接到 Factory 合约，监听 `TokenCreated` 事件
2. **获取参数**：当事件触发时，读取代币和 Market 合约的构造函数参数
3. **自动验证**：调用 Hardhat 的 `verify:verify` 任务进行合约验证
4. **重试机制**：如果验证失败，会自动重试最多 5 次

## 使用方法

### 启动监听器

```bash
cd contracts
npx hardhat run scripts/autoVerifyTokens.ts --network bsc
```

### 停止监听器

按 `Ctrl+C` 停止

### 后台运行（推荐）

使用 `screen` 或 `tmux` 在服务器上长期运行：

```bash
# 使用 screen
screen -S auto-verify
npx hardhat run scripts/autoVerifyTokens.ts --network bsc
# 按 Ctrl+A, D 分离会话

# 恢复会话
screen -r auto-verify
```

## 支持的合约类型

### 1. MemeToken（无税代币）
- templateId: 0
- 构造函数参数：name, symbol, totalSupply, factory, factory

### 2. MemeTokenTax（带税代币）
- templateId: 1
- 构造函数参数：name, symbol, totalSupply, factory, factory, treasury, wbnb, router, taxBps, burnShareBps, holderShareBps, liquidityShareBps, buybackShareBps

### 3. BondingCurveMarket（曲线市场）
- 所有代币类型都需要验证
- 构造函数参数从链上动态读取

## 注意事项

1. **需要配置 BSCSCAN_API_KEY**
   - 在 `.env` 文件中设置 `BSCSCAN_API_KEY=你的API密钥`
   - 获取 API Key：https://bscscan.com/myapikey

2. **首次运行建议从最新区块开始**
   - 脚本会自动从当前区块开始监听
   - 如果需要验证历史代币，请使用其他脚本

3. **验证延迟**
   - 脚本会在检测到代币创建后等待 10 秒再开始验证
   - 这是为了确保合约已完全部署到区块链

4. **错误处理**
   - 如果验证失败，脚本会显示错误信息但不会退出
   - 可以手动使用 `verifyToken.ts` 或 `verifyTokenMarket.ts` 重新验证

## 故障排查

### 问题：验证一直失败
**解决方案**：
1. 检查 BSCSCAN_API_KEY 是否正确
2. 确认网络连接正常
3. 等待几分钟后重试（可能是 BSCScan API 限流）

### 问题：监听器没有响应
**解决方案**：
1. 确认 Factory 地址正确
2. 检查是否连接到了正确的网络（bsc）
3. 查看是否有新的 TokenCreated 事件触发

### 问题：TypeScript 编译错误
**解决方案**：
```bash
cd contracts
npm install
npx hardhat compile
```

## 相关脚本

- `verifyToken.ts` - 手动验证单个代币合约
- `verifyTokenMarket.ts` - 手动验证代币和 Market 合约
- `verifyLatestToken.ts` - 验证最近创建的代币
- `watchVerify.ts` - 另一个监听验证脚本（旧版）

## 部署建议

对于生产环境，建议：
1. 在 VPS 上使用 `pm2` 或 `systemd` 管理监听器进程
2. 添加日志记录功能
3. 设置监控告警（如验证失败时发送通知）
4. 定期清理日志文件
