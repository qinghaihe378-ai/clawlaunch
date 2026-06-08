# Cloudflare 部署指南

## 📦 项目结构

```
clawlaunch/
├── web/              # 前端 (Cloudflare Pages)
│   ├── src/
│   └── dist/         # 构建输出
├── workers/
│   └── api/          # 后端 API (Cloudflare Workers)
│       ├── src/
│       ├── package.json
│       └── wrangler.toml
└── contracts/        # 智能合约
```

---

## 🚀 部署步骤

### 第 1 步：安装 Cloudflare CLI

```bash
npm install -g wrangler
```

### 第 2 步：登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，让你授权 Cloudflare 访问。

---

### 第 3 步：部署后端 API (Workers)

```bash
cd workers/api
npm install
npm run deploy
```

**首次部署会提示你：**
- 创建一个新的 Worker 项目
- 选择项目名称（建议：`clawlaunch-api`）

**部署成功后会显示：**
```
https://clawlaunch-api.your-subdomain.workers.dev
```

---

### 第 4 步：配置环境变量

在 Cloudflare Dashboard 中设置：

1. 访问：https://dash.cloudflare.com/
2. 进入 **Workers & Pages**
3. 选择 `clawlaunch-api`
4. 点击 **Settings** → **Variables**
5. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB 连接（可选） |
| `REDIS_URL` | `redis://...` | Redis 缓存（可选） |
| `BNB_RPC_URL` | `https://bsc-dataseed.bnbchain.org` | BSC RPC |

---

### 第 5 步：部署前端 (Pages)

#### 方法 A：通过 Cloudflare Dashboard（推荐）

1. 访问：https://dash.cloudflare.com/
2. 进入 **Workers & Pages**
3. 点击 **Create application** → **Pages**
4. 点击 **Connect to Git**
5. 选择你的 GitHub 仓库 `clawlaunch`
6. 配置构建设置：

```
Framework preset: Vite
Build command: npm run build
Build output directory: web/dist
Root directory: /
```

7. 配置环境变量：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_BASE_URL` | `https://clawlaunch-api.your-subdomain.workers.dev/api` |

8. 点击 **Save and Deploy**

---

#### 方法 B：通过 CLI

```bash
cd web
npm run build
wrangler pages deploy dist --project-name=clawlaunch
```

---

## 🔗 最终访问地址

- **前端**: `https://clawlaunch.pages.dev`
- **后端 API**: `https://clawlaunch-api.your-subdomain.workers.dev/api`

---

## ⚙️ 本地开发

### 前端开发

```bash
cd web
npm run dev
# 访问 http://localhost:5173
```

### 后端开发

```bash
cd workers/api
npm run dev
# 访问 http://localhost:8787/api/health
```

---

## 💰 成本说明

### Cloudflare 免费额度

**Workers:**
- ✅ 100,000 请求/天
- ✅ 10ms CPU 时间/请求
- ✅ 足够小型项目使用

**Pages:**
- ✅ 500 次构建/月
- ✅ 100GB 带宽/月
- ✅ 完全够用

**总成本：$0/月** 🎉

---

## 🔧 常见问题

### Q1: 如何更新代码？

```bash
git add .
git commit -m "更新内容"
git push
```

Cloudflare 会自动检测 GitHub 推送并重新部署。

### Q2: 如何查看日志？

**Workers 日志：**
```bash
wrangler tail clawlaunch-api
```

**Pages 日志：**
在 Cloudflare Dashboard → Pages → 你的项目 → **Deployments** → 点击查看日志

### Q3: 如何自定义域名？

1. 在 Cloudflare Dashboard 进入你的项目
2. 点击 **Custom domains**
3. 添加你的域名
4. 按照提示配置 DNS

---

## 📝 下一步

1. ✅ 部署后端 Workers
2. ✅ 部署前端 Pages
3. ✅ 配置环境变量
4. ✅ 测试功能
5. ✅ 配置自定义域名（可选）

---

## 🆘 需要帮助？

- Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
- Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
- Wrangler CLI 文档：https://developers.cloudflare.com/workers/wrangler/
