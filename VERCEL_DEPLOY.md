# Vercel 部署指南

## 📦 项目结构

```
clawlaunch/
├── api/              # Vercel Serverless Functions (后端 API)
│   └── index.ts      # API 路由处理
├── web/              # 前端 (Vite + React)
├── server/           # 原始 Express 后端 (本地开发用)
├── contracts/        # 智能合约
├── vercel.json       # Vercel 配置文件
└── package.json      # 根目录配置
```

## 🚀 部署到 Vercel

### 步骤 1：连接 GitHub 仓库

1. 访问 https://vercel.com
2. 使用 GitHub 账号登录
3. 点击 **"Add New..."** → **"Project"**
4. 选择 **clawlaunch** 仓库
5. 点击 **Import**

### 步骤 2：配置构建设置

Vercel 会自动检测 `vercel.json` 配置文件，无需手动配置。

**自动配置内容：**
- ✅ 前端构建：`web/package.json` → `@vercel/static-build`
- ✅ 后端 API：`api/**/*.ts` → `@vercel/node`
- ✅ 路由规则：`/api/*` → API 函数，其他 → 静态文件

### 步骤 3：配置环境变量

在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量：

```bash
# MongoDB 连接字符串
MONGODB_URI=mongodb+srv://用户名:密码@cluster.mongodb.net/longxia

# Redis 连接字符串（可选，用于缓存）
REDIS_URL=redis://default:密码@host:port

# BNB Chain RPC URL（可选，默认使用公共节点）
BNB_RPC_URL=https://bsc-dataseed.bnbchain.org
BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545

# 工厂合约地址（可选，默认使用 deployments 中的地址）
FACTORY_V1_ADDRESS_BSC=0x...
FACTORY_V1_ADDRESS_BSC_TESTNET=0x...

# 缓存 TTL（秒）
CACHE_TTL_SECONDS=15
```

#### 前端环境变量：

```bash
# API 基础 URL（生产环境使用 Vercel 域名）
VITE_API_URL=https://你的项目名.vercel.app/api
```

### 步骤 4：点击 Deploy

等待构建完成（约 2-5 分钟），你会获得：
- 前端域名：`https://clawlaunch.vercel.app`
- API 端点：`https://clawlaunch.vercel.app/api/*`

## 🔧 API 端点

部署后，以下 API 端点可用：

```
GET /api/health                          # 健康检查
GET /api/factories                       # 工厂列表
GET /api/tokens?page=1&pageSize=20       # 代币列表
GET /api/tokens/:address                 # 代币详情
```

## 📝 本地测试

### 测试 Vercel API（本地）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 本地运行
vercel dev
```

### 测试前端

```bash
cd web
npm run dev
```

## ⚠️ 注意事项

### 1. Serverless 限制

- **执行时间限制**：10 秒（Hobby 计划）
- **内存限制**：1024 MB
- **冷启动**：首次访问可能较慢

### 2. 数据库连接

- MongoDB 和 Redis 需要使用外部服务
- 推荐使用 MongoDB Atlas（免费层可用）
- 推荐使用 Upstash Redis（免费层可用）

### 3. 区块链 RPC

- 公共 RPC 节点可能有速率限制
- 建议使用私有 RPC 节点（如 QuickNode、Alchemy）

### 4. 环境变量

- **不要**将 `.env` 文件提交到 Git
- 所有敏感信息都在 Vercel Dashboard 中配置
- 前端环境变量需要以 `VITE_` 开头

## 🔄 自动部署

每次推送到 GitHub `main` 分支时，Vercel 会自动：
1. 拉取最新代码
2. 安装依赖
3. 构建前端
4. 部署 API 函数
5. 更新生产环境

## 🐛 故障排查

### 问题：API 返回 500 错误

**解决方案：**
1. 检查 Vercel Dashboard 的 Logs 标签
2. 确认环境变量已正确配置
3. 验证 MongoDB/Redis 连接字符串

### 问题：前端无法连接 API

**解决方案：**
1. 检查 `VITE_API_URL` 环境变量
2. 确认 CORS 配置正确
3. 查看浏览器控制台的错误信息

### 问题：构建失败

**解决方案：**
1. 检查 `vercel.json` 配置
2. 确认 `web/package.json` 中有正确的 build 脚本
3. 查看 Vercel Build Logs

## 📊 监控和日志

- **实时日志**：Vercel Dashboard → Logs 标签
- **部署历史**：Vercel Dashboard → Deployments 标签
- **性能指标**：Vercel Dashboard → Analytics 标签

## 🎯 下一步优化

1. **添加 CDN 缓存**：在 `vercel.json` 中配置缓存头
2. **启用 Edge Functions**：更快的 API 响应
3. **添加自定义域名**：在 Vercel Dashboard 配置
4. **设置告警**：监控错误率和响应时间

---

**仓库地址**：https://github.com/qinghaihe378-ai/clawlaunch  
**Vercel 文档**：https://vercel.com/docs
