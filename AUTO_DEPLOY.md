# 🚀 Vultr VPS 全自动部署 - 只需 3 步

## 📋 前置准备（在 Vultr Dashboard 完成）

### ✅ 已完成：
- [x] 注册 Vultr 账号
- [x] 充值账户（加密货币支付）
- [x] 创建 VPS（Ubuntu 22.04, $5/月, 美国节点）
- [x] 记录服务器 IP 和 root 密码

### 📝 需要准备：
1. **域名**：例如 `api.yourdomain.com`
2. **GitHub 仓库地址**：您的代码仓库 URL
3. **配置 DNS**：将域名指向 VPS IP（稍后配置）

---

## 🎯 全自动部署（只需 3 条命令）

### 第一步：SSH 连接服务器

```bash
# 在本地终端执行（替换为您的实际 IP）
ssh root@YOUR_VPS_IP

# 输入 root 密码（粘贴时不会显示）
```

**✅ 成功标志**：看到命令行提示符变为 `root@vultr:~#`

---

### 第二步：下载并运行自动化脚本

**直接复制以下完整命令，一次性粘贴到服务器终端：**

```bash
cd /opt && \
wget https://raw.githubusercontent.com/YOUR_USERNAME/longxia/main/deploy-vultr.sh && \
chmod +x deploy-vultr.sh && \
bash deploy-vultr.sh api.yourdomain.com
```

**⚠️ 重要：请将以下内容替换为您的实际信息：**
- `YOUR_USERNAME` → 您的 GitHub 用户名
- `api.yourdomain.com` → 您的实际域名

**或者，分步执行（更清晰）：**

```bash
# 1. 进入 /opt 目录
cd /opt

# 2. 下载部署脚本
wget https://raw.githubusercontent.com/YOUR_USERNAME/longxia/main/deploy-vultr.sh

# 3. 添加执行权限
chmod +x deploy-vultr.sh

# 4. 运行部署脚本（替换为您的域名）
bash deploy-vultr.sh api.yourdomain.com
```

---

### 第三步：等待自动完成（约 10-15 分钟）

**脚本会自动完成以下所有操作：**

1. ✅ 更新 Ubuntu 系统
2. ✅ 安装 Node.js 20.x
3. ✅ 安装 PM2 进程管理器
4. ✅ 克隆您的 GitHub 代码
5. ✅ 安装 npm 依赖
6. ✅ 构建后端项目
7. ✅ 配置 PM2 开机自启
8. ✅ 配置 Nginx 反向代理
9. ✅ 获取 Let's Encrypt SSL 证书
10. ✅ 配置防火墙
11. ✅ 设置监控和日志

**您只需要：**
- 当提示输入 GitHub 仓库地址时，输入您的仓库 URL
- 其他全部自动完成！

---

## ✅ 验证部署

### 测试 API

```bash
# 测试健康检查端点
curl https://api.yourdomain.com/api/health

# 应该返回：
# {"code":200,"msg":"success","data":{"status":"ok"}}
```

### 测试代币列表

```bash
# 测试代币列表 API
curl "https://api.yourdomain.com/api/tokens?page=1&pageSize=5"

# 应该返回代币列表 JSON
```

### 查看服务状态

```bash
# 运行监控脚本
bash monitor.sh
```

会显示：
- ✅ 服务运行状态
- ✅ 内存和 CPU 使用
- ✅ 端口监听情况
- ✅ 最近的错误日志

---

## 🔧 如果遇到问题

### 问题 1：DNS 未生效，SSL 证书获取失败

**症状**：脚本提示 "SSL 证书获取失败，可能是 DNS 未生效"

**解决方案**：
1. 等待 5-10 分钟让 DNS 生效
2. 手动运行：
   ```bash
   certbot --nginx -d api.yourdomain.com
   ```

### 问题 2：GitHub 仓库不存在或私有

**症状**：git clone 失败

**解决方案**：
1. 确保仓库已公开，或使用 SSH key
2. 或者手动上传代码：
   ```bash
   cd /opt
   mkdir longxia
   # 用 SFTP 上传代码到 /opt/longxia
   cd longxia
   bash deploy-vultr.sh api.yourdomain.com
   ```

### 问题 3：端口被占用

**症状**：Nginx 启动失败

**解决方案**：
```bash
# 检查端口占用
netstat -tuln | grep 80
netstat -tuln | grep 3001

# 停止占用端口的服务
systemctl stop apache2  # 如果有 Apache
```

---

## 🔄 日常维护

### 更新代码

当您在 GitHub 推送新代码后：

```bash
bash update.sh
```

**自动完成：**
- ✅ 从 Git 拉取最新代码
- ✅ 安装新依赖
- ✅ 重新构建
- ✅ 重启服务

### 查看日志

```bash
# 实时查看日志
pm2 logs clawlaunch-api

# 查看最近 100 行
pm2 logs clawlaunch-api --lines 100

# 只查看错误日志
pm2 logs clawlaunch-api --err
```

### 重启服务

```bash
# 重启服务
pm2 restart clawlaunch-api

# 停止服务
pm2 stop clawlaunch-api

# 启动服务
pm2 start clawlaunch-api
```

### 监控面板

```bash
# 运行监控脚本
bash monitor.sh
```

---

## 📊 性能优化建议

### 调整缓存时间

编辑 `workers/api/src/index.ts`：

```typescript
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '600') // 10 分钟
```

修改后运行：
```bash
bash update.sh
```

### 监控资源使用

定期运行 `bash monitor.sh` 检查：
- 内存使用 < 200 MB ✅
- CPU 使用 < 80% ✅
- 磁盘空间 < 80% ✅

---

##  成本估算

### Vultr $5/月套餐

```
月度费用：$5
- 可支撑用户：5,000-8,000 日活
- 带宽：不限（公平使用政策）
- 存储：25 GB NVMe SSD

首次充值建议：$10-20（可用 2-4 个月）
```

---

## 🎉 恭喜！

如果您看到以下信息，说明部署成功：

```
==========================================
  🎉 部署完成！
==========================================

✅ 后端服务已启动并运行
✅ Nginx 反向代理已配置
✅ SSL 证书已安装

 访问地址：
   HTTP:  http://api.yourdomain.com
   HTTPS: https://api.yourdomain.com

🧪 测试 API：
   curl https://api.yourdomain.com/api/health
```

**现在您的后端已经完全自动化托管！** 🚀

---

## 📞 需要帮助？

如果遇到任何问题，请告诉我：
1. 具体的错误信息
2. 当前执行的步骤
3. 截图或日志内容

我会立即帮您解决！
