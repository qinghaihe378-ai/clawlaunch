# Cloudflare 快速部署指南 🚀

## ✅ 已完成的工作

我已经为你完成了 Cloudflare 迁移的所有代码准备工作：

1. ✅ **Workers API** - 完整的后端 API，包含区块链查询功能
2. ✅ **Hono 框架** - 轻量级 Web 框架，适合 Workers
3. ✅ **Viem 集成** - 直接从 BSC 区块链读取数据
4. ✅ **完整 ABI** - Factory、Market、ERC20 合约接口
5. ✅ **CORS 支持** - 跨域请求支持
6. ✅ **错误处理** - 完善的错误捕获和响应

---

## 🎯 部署步骤（超简单）

### 第 1 步：安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 第 2 步：登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器，授权 Cloudflare 访问。

### 第 3 步：一键部署后端

```bash
./deploy-cloudflare.sh
```

或者手动执行：

```bash
cd workers/api
npm install
npm run deploy
```

**首次部署会提示：**
- 创建新项目？选择 `y`
- 项目名称：输入 `clawlaunch-api` 或直接回车

**部署成功后会显示：**
```
https://clawlaunch-api.your-subdomain.workers.dev
```

**复制这个 URL！**

---

### 第 4 步：部署前端 (Pages)

#### 方法 A：通过 Dashboard（推荐，最简单）

1. 访问：https://dash.cloudflare.com/
2. 点击左侧 **Workers & Pages**
3. 点击 **Create application** → **Pages**
4. 点击 **Connect to Git**
5. 选择仓库：`qinghaihe378-ai/clawlaunch`
6. 配置构建设置：

```
Framework preset: Vite
Build command: npm run build
Build output directory: web/dist
Root directory (optional): /
```

7. **重要：添加环境变量**

点击 **Environment variables** → **Add variable**

```
Variable name: VITE_API_BASE_URL
Value: https://clawlaunch-api.your-subdomain.workers.dev/api
```

8. 点击 **Save and Deploy**

等待 2-3 分钟，部署完成！

---

#### 方法 B：通过 CLI

```bash
cd web
npm run build
wrangler pages deploy dist --project-name=clawlaunch
```

然后在 Dashboard 中添加环境变量 `VITE_API_BASE_URL`。

---

## 🎉 完成！

你的网站现在运行在：
- **前端**: `https://clawlaunch.pages.dev`
- **后端**: `https://clawlaunch-api.your-subdomain.workers.dev/api`

---

## 💰 成本

**完全免费！** 🎊

Cloudflare 免费额度：
- ✅ Workers: 100,000 请求/天
- ✅ Pages: 500 次构建/月 + 100GB 带宽
- ✅ 对于你的项目绰绰有余

---

## 🔧 更新代码

每次修改代码后：

```bash
git add .
git commit -m "描述改动"
git push
```

Cloudflare 会自动检测并重新部署！

---

## 📊 查看日志

### Workers 日志
```bash
wrangler tail clawlaunch-api
```

### Pages 日志
Dashboard → Pages → 你的项目 → **Deployments** → 点击查看

---

## ⚙️ 本地开发

### 前端
```bash
cd web
npm run dev
# http://localhost:5173
```

### 后端
```bash
cd workers/api
npm install
npm run dev
# http://localhost:8787/api/health
```

---

## 🆘 常见问题

### Q1: 部署失败怎么办？

检查错误信息，常见原因：
- ❌ 未登录：运行 `wrangler login`
- ❌ 依赖未安装：运行 `npm install`
- ❌ 名称冲突：换一个项目名称

### Q2: 前端无法连接后端？

检查环境变量 `VITE_API_BASE_URL` 是否正确：
```
应该是：https://clawlaunch-api.xxx.workers.dev/api
不是：https://clawlaunch-api.xxx.workers.dev
```

### Q3: 如何自定义域名？

Dashboard → 你的项目 → **Custom domains** → 添加域名

---

## 📝 下一步建议

1. ✅ 测试所有功能是否正常
2. ✅ 配置自定义域名（可选）
3. ✅ 添加监控和告警（可选）
4. ✅ 删除 Vercel 项目（如果不再需要）

---

## 🎯 与 Vercel 对比

| 特性 | Vercel | Cloudflare |
|------|--------|------------|
| 前端托管 | ✅ | ✅ |
| 后端 API | ✅ | ✅ |
| 全球 CDN | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 免费额度 | 100万请求/月 | 300万请求/月 |
| 统一管理 | ❌ | ✅ |
| DDoS 保护 | 付费 | ✅ 免费 |
| 自定义域名 | ✅ | ✅ 免费 SSL |

**结论：Cloudflare 更适合你的项目！** 🚀

---

## 📞 需要帮助？

随时问我！我会帮你解决任何问题。

祝你部署顺利！🎉
