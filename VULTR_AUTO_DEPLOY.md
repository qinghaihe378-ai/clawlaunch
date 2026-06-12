# 🚀 Vultr VPS 全自动部署 - 只需 1 条命令！

## 📋 **前置准备**

### ✅ 已完成：
- [x] Vultr VPS 已创建（IP: 144.202.55.254）
- [x] Ubuntu 22.04/24.04
- [x] $5/月套餐（1 vCPU, 1 GB RAM）

### 📝 需要准备：
- [ ] SSH 连接到服务器，或使用 Vultr Web Console

---

## 🎯 **全自动部署（只需 1 条命令）**

### 方式 A：使用 SSH（推荐）

```bash
# 1. SSH 连接服务器
ssh root@144.202.55.254

# 2. 运行一键部署命令
curl -fsSL https://raw.githubusercontent.com/qinghaihe378-ai/clawlaunch/main/auto-deploy-vultr.sh | bash
```

### 方式 B：使用 Vultr Web Console（如果 SSH 连不上）

1. 登录 [Vultr.com](https://my.vultr.com/)
2. 点击您的 VPS（IP: 144.202.55.254）
3. 找到 **"Console"** 或 **"View Console"** 按钮
4. 在打开的终端中粘贴以下命令：

```bash
curl -fsSL https://raw.githubusercontent.com/qinghaihe378-ai/clawlaunch/main/auto-deploy-vultr.sh | bash
```

---

## ⏱️ **等待完成（约 10-15 分钟）**

脚本会自动完成以下所有操作：

1. ✅ 更新 Ubuntu 系统
2. ✅ 安装 Node.js 20.x
3. ✅ 安装 PM2 进程管理器
4. ✅ 克隆前端代码（https://github.com/qinghaihe378-ai/clawlaunch）
5. ✅ 克隆后端代码（https://github.com/qinghaihe378-ai/workflows-starter-template）
6. ✅ 构建前端项目
7. ✅ 构建后端项目
8. ✅ 配置 PM2 开机自启
9. ✅ 配置 Nginx 反向代理
10. ✅ 配置防火墙
11. ✅ 启动所有服务

**您只需要等待，无需任何操作！**

---

## ✅ **验证部署**

### 测试 API

```bash
curl http://144.202.55.254/api/health
```

应该返回：
```json
{"code":200,"msg":"success","data":{"status":"ok"}}
```

### 访问网站

在浏览器中打开：
```
http://144.202.55.254
```

应该看到 ClawLaunch 前端页面。

### 查看服务状态

```bash
pm2 status
```

应该显示 `clawlaunch-api` 服务正在运行。

---

## 🔧 **如果遇到问题**

### 问题 1：SSH 连接超时

**解决方案**：使用 Vultr Web Console（见上方方式 B）

### 问题 2：前端环境变量未配置

**症状**：前端无法调用 API

**解决方案**：

```bash
cd /opt/frontend
echo "VITE_API_URL=/api" >> .env.production
npm run build
```

### 问题 3：后端服务未启动

**解决方案**：

```bash
pm2 logs clawlaunch-api
pm2 restart clawlaunch-api
```

### 问题 4：Nginx 配置错误

**解决方案**：

```bash
nginx -t
systemctl status nginx
```

---

## 🔄 **日常维护**

### 更新前端代码

```bash
cd /opt/frontend
git pull
npm install
npm run build
```

### 更新后端代码

```bash
cd /opt/backend
git pull
cd server
npm install
npm run build
pm2 restart all
```

### 查看日志

```bash
# 实时日志
pm2 logs clawlaunch-api

# 最近 100 行
pm2 logs clawlaunch-api --lines 100
```

### 重启服务

```bash
pm2 restart all
```

---

## 📊 **性能监控**

### 查看资源使用

```bash
# CPU 和内存
pm2 monit

# 磁盘空间
df -h

# 端口监听
netstat -tuln | grep -E '80|3001'
```

---

## 🎉 **恭喜！**

如果您看到以下信息，说明部署成功：

```
==========================================
  🎉 部署完成！
==========================================

🌐 访问地址：
   http://144.202.55.254

🧪 测试 API：
   curl http://144.202.55.254/api/health

 监控服务：
   pm2 status
   pm2 logs clawlaunch-api
```

**现在您的 ClawLaunch 平台已经完全自动化托管！** 

---

## 💡 **重要提示**

1. **前端环境变量**
   - 确保 `.env.production` 中包含 `VITE_API_URL=/api`
   - 这样前端才能正确调用后端 API

2. **HTTPS 配置**
   - 当前使用 HTTP（无加密）
   - 如果需要 HTTPS，请配置域名后运行：
     ```bash
     certbot --nginx -d yourdomain.com
     ```

3. **定期备份**
   - 建议定期备份数据库和配置文件
   - 可以使用 `tar` 命令打包 `/opt` 目录

4. **安全建议**
   - 定期更新系统：`apt update && apt upgrade -y`
   - 监控异常日志：`pm2 logs --err`
   - 限制 SSH 访问 IP（可选）

---

## 📞 **需要帮助？**

如果遇到任何问题，请告诉我：
1. 具体的错误信息
2. 当前执行的步骤
3. 截图或日志内容

我会立即帮您解决！
