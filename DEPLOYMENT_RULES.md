# 🚨 前后端分离架构 - 绝对禁止违反的规则

## ️ 核心原则（必须严格遵守）

### 1. 部署架构（不可更改）
```
✅ 前端 = web/ 目录 → Vercel（纯静态文件，无任何后端代码）
✅ 后端 = workers/api/ 目录 → Cloudflare Workers
❌ 禁止：Vercel 上有任何后端 API（Serverless Functions）
```

### 2. 文件夹结构规则
```
允许创建的文件夹：
- web/          （前端 React + Vite）
- workers/api/  （后端 Cloudflare Workers）
- server/       （本地开发用 Express，不部署）
- contracts/    （智能合约）

绝对禁止创建的文件夹：
- api/          （根目录）
- web/api/      （Vercel 会识别为 Serverless Functions）
- web/functions/（Vercel 会识别为 Serverless Functions）
```

### 3. 环境变量配置
```
web/.env 中必须设置：
VITE_API_BASE_URL=https://clawlaunch.qinghaihe378.workers.dev/api

❌ 禁止设置为 /api（这会指向 Vercel）
❌ 禁止设置为其他 URL
```

### 4. vercel.json 配置
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
 禁止添加任何 `/api` 路由规则

### 5. .gitignore 保护规则
```
以下文件夹已被 .gitignore 禁止提交：
- api/
- web/api/
- web/functions/

即使创建了这些文件夹，Git 也不会追踪它们
```

## 🛡️ 操作前检查清单

每次修改代码前，必须执行以下检查：

### 检查 1：确认没有创建错误的文件夹
```bash
./check-api-dirs.sh
```

如果脚本报错，立即删除错误的文件夹：
```bash
rm -rf api/ web/api/ web/functions/
```

### 检查 2：确认前端环境变量正确
```bash
grep "VITE_API_BASE_URL" web/.env
```

应该输出：
```
VITE_API_BASE_URL=https://clawlaunch.qinghaihe378.workers.dev/api
```

### 检查 3：确认 vercel.json 没有 API 路由
```bash
cat web/vercel.json
```

不应该包含 `/api` 相关的路由规则

### 检查 4：确认 Git 不会提交错误文件
```bash
git status --short | grep -E "api|functions"
```

应该没有任何输出（除了 `check-api-dirs.sh`）

## ❌ 常见错误及解决方案

### 错误 1：不小心创建了 api/ 文件夹
**原因：** 误以为需要在根目录创建 API 路由

**解决：**
```bash
rm -rf api/
./check-api-dirs.sh  # 验证已删除
```

### 错误 2：在 web/ 目录下创建了 api/ 或 functions/
**原因：** 误以为 Vercel 需要这些文件夹来提供 API

**解决：**
```bash
rm -rf web/api/ web/functions/
./check-api-dirs.sh  # 验证已删除
```

### 错误 3：修改了 VITE_API_BASE_URL 指向 /api
**原因：** 误以为前端应该调用 Vercel 的 API

**解决：**
```bash
# 修改 web/.env
VITE_API_BASE_URL=https://clawlaunch.qinghaihe378.workers.dev/api
```

### 错误 4：在 vercel.json 中添加了 API 路由
**原因：** 误以为需要配置 Vercel 的 API 路由

**解决：**
```bash
# 恢复 web/vercel.json 到只有 SPA 重定向
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 🔍 如何判断某个文件应该放在哪里？

### 问自己这些问题：

1. **这是前端代码吗？**（React 组件、页面、样式等）
   - ✅ 是 → 放在 `web/src/`
   - ❌ 否 → 继续问下一个问题

2. **这是后端 API 吗？**（处理 HTTP 请求、查询链上数据等）
   - ✅ 是 → 放在 `workers/api/src/`
   - ❌ 否 → 继续问下一个问题

3. **这是本地开发用的服务器吗？**（Express.js 等）
   - ✅ 是 → 放在 `server/src/`（仅本地使用，不部署）
   - ❌ 否 → 继续问下一个问题

4. **这是智能合约吗？**（Solidity 代码）
   - ✅ 是 → 放在 `contracts/contracts/`
   - ❌ 否 → 不确定，先询问用户

### 快速参考表：

| 文件类型 | 应该放在 | 部署到 |
|---------|---------|--------|
| React 组件 | `web/src/pages/` | Vercel |
| 页面路由 | `web/src/pages/` | Vercel |
| 样式文件 | `web/src/` | Vercel |
| Vite 配置 | `web/vite.config.ts` | Vercel |
| HTML 模板 | `web/index.html` | Vercel |
| 后端 API | `workers/api/src/` | Cloudflare Workers |
| Wrangler 配置 | `workers/api/wrangler.toml` | Cloudflare Workers |
| Express 服务器 | `server/src/` | 仅本地 |
| Solidity 合约 | `contracts/contracts/` | BSC 链上 |

## 🚨 违规后果

如果违反上述规则：
1. `.gitignore` 会阻止提交到 Git
2. `check-api-dirs.sh` 会检测到并报错
3. Vercel 部署会失败或部署错误的代码
4. 前后端混淆导致功能异常

## ✅ 正确的操作流程

### 修改前端代码：
1. 编辑 `web/src/` 下的文件
2. 运行 `cd web && npm run dev` 本地测试
3. `git add web/`
4. `git commit -m "feat: ..."`
5. `git push`
6. Vercel 自动部署前端

### 修改后端代码：
1. 编辑 `workers/api/src/` 下的文件
2. 运行 `cd workers/api && npx wrangler dev` 本地测试
3. `git add workers/api/`
4. `git commit -m "feat: ..."`
5. `git push`
6. 运行 `cd workers/api && npx wrangler deploy` 部署到 Cloudflare

### 同时修改前后端：
1. 分别按照上述流程修改
2. 一次性提交：`git add web/ workers/api/`
3. `git commit -m "feat: 同时更新前后端"`
4. `git push`
5. Vercel 和 Cloudflare 分别自动部署

##  遇到问题时

如果不确定某个文件应该放在哪里，或者遇到部署问题：

1. **先运行检查脚本：**
   ```bash
   ./check-api-dirs.sh
   ```

2. **查看当前架构：**
   ```bash
   cat web/.env | grep VITE_API_BASE_URL
   cat web/vercel.json
   ```

3. **如果仍然不确定，立即询问用户！**

---

**最后提醒：**
- ✅ Vercel = 纯前端（静态文件）
- ✅ Cloudflare Workers = 后端 API
- ❌ 永远不要在 Vercel 上部署后端代码
- ❌ 永远不要创建 `api/`、`web/api/`、`web/functions/` 文件夹
