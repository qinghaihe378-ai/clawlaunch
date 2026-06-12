# Vultr VPS 自动化部署指南

## 📋 前置准备

### 1. 注册 Vultr 账号
- 访问：https://www.vultr.com
- 点击 "Sign Up" 注册账号
- 验证邮箱

### 2. 充值账户（加密货币支付）
- 登录 Dashboard
- 点击 "Billing" → "Add Payment Method"
- 选择 "Cryptocurrency"
- 通过 BitPay 充值 $10-20
- 等待区块链确认（10-30 分钟）

### 3. 创建 VPS
- 点击 "Deploy" → "New Server"
- 选择 "Cloud Compute"
- **服务器位置**：Singapore（推荐，亚洲用户延迟最低）
- **操作系统**：Ubuntu 22.04 LTS x64
- **套餐**：$5/month (1 vCPU, 1 GB RAM, 25 GB NVMe SSD)
- 点击 "Deploy Now"
- 等待 60-90 秒，VPS 创建完成

### 4. 记录服务器信息
从 Vultr Dashboard 复制：
- **IP 地址**：例如 `123.45.67.89`
- **root 密码**：点击 "View Password" 查看

---

## 🚀 自动化部署（3 步完成）

### 步骤 1：SSH 连接服务器

```bash
# 在本地终端执行（Mac/Linux）
ssh root@YOUR_SERVER_IP

# Windows 用户使用 PuTTY 或 PowerShell
# 输入 root 密码（粘贴时不会显示）
```

首次登录会提示修改密码，按提示操作。

### 步骤 2：上传部署脚本

#### 方法 A：使用 Git（推荐）

```bash
# 在服务器上执行
cd /opt
git clone https://github.com/YOUR_USERNAME/longxia.git
cd longxia

# 给脚本添加执行权限
chmod +x deploy-vultr.sh setup-nginx.sh monitor.sh update.sh
```

#### 方法 B：直接下载脚本

```bash
# 如果代码还未公开，可以单独下载脚本
cd /opt
mkdir -p longxia
cd longxia

# 下载各个脚本（需要替换为实际的 raw URL）
wget https://raw.githubusercontent.com/YOUR_USERNAME/longxia/main/deploy-vultr.sh
wget https://raw.githubusercontent.com/YOUR_USERNAME/longxia/main/setup-nginx.sh
wget https://raw.githubusercontent.com/YOUR_USERNAME/longxia/main/monitor.sh
wget https://raw.githubusercontent.com/YOUR_USERNAME/longxia/main/update.sh

chmod +x *.sh
```

### 步骤 3：运行一键部署脚本

```bash
# 在服务器上执行
bash deploy-vultr.sh
```

**脚本会自动完成：**
1. ✅ 更新系统
2. ✅ 安装 Node.js 20.x
3. ✅ 安装 PM2 进程管理器
4. ✅ 克隆代码仓库
5. ✅ 安装依赖
6. ✅ 构建项目
7. ✅ 配置 PM2 自动重启
8. ✅ 配置防火墙

**耗时：约 5-10 分钟**

---

## 🔐 配置域名和 SSL

### 步骤 1：配置 DNS

在您的域名服务商处（如 Cloudflare、Namecheap、GoDaddy）：

1. 添加 A 记录：
   - **主机记录**：`api`（或 `@`）
   - **记录值**：您的 VPS IP 地址
   - **TTL**：自动

2. 等待 DNS 生效（通常 1-10 分钟）

### 步骤 2：运行 Nginx 配置脚本

```bash
# 在服务器上执行（替换为您的实际域名）
bash setup-nginx.sh api.yourdomain.com
```

**脚本会自动完成：**
1. ✅ 创建 Nginx 反向代理配置
2. ✅ 配置 Let's Encrypt SSL 证书
3. ✅ 设置证书自动续期
4. ✅ 启动 Nginx

**耗时：约 2-5 分钟**

---

## ✅ 验证部署

### 测试 API

```bash
# 测试健康检查端点
curl https://api.yourdomain.com/api/health

# 应该返回：
# {"code":200,"msg":"success","data":{"status":"ok"}}
```

### 测试代币列表 API

```bash
# 测试代币列表
curl "https://api.yourdomain.com/api/tokens?page=1&pageSize=5"

# 应该返回代币列表 JSON
```

### 查看服务状态

```bash
# 运行监控脚本
bash monitor.sh
```

会显示：
- 服务运行状态
- 内存和 CPU 使用
- 磁盘空间
- 端口监听情况
- 最近的错误日志

---

## 🔄 日常维护

### 更新代码

当您在 GitHub 推送新代码后：

```bash
# 在服务器上执行
bash update.sh
```

**脚本会自动：**
1. ✅ 从 Git 拉取最新代码
2. ✅ 安装新依赖
3. ✅ 重新构建
4. ✅ 重启服务

**耗时：约 1-2 分钟**

### 查看日志

```bash
# 实时查看日志
pm2 logs clawlaunch-api

# 查看最近 100 行日志
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

## 🛠️ 故障排查

### 问题 1：服务无法启动

```bash
# 查看错误日志
pm2 logs clawlaunch-api --err

# 常见原因：
# 1. 端口 3001 被占用
netstat -tuln | grep 3001

# 2. 依赖未安装
cd /opt/longxia/workers/api
npm install

# 3. 构建失败
npm run build
```

### 问题 2：API 返回 502 Bad Gateway

```bash
# 检查后端服务是否运行
pm2 status

# 检查 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx

# 检查防火墙
ufw status
```

### 问题 3：SSL 证书问题

```bash
# 手动续期证书
certbot renew

# 重新配置 SSL
certbot --nginx -d api.yourdomain.com
```

### 问题 4：内存不足

```bash
# 查看内存使用
free -h

# 清理 PM2 日志
pm2 flush

# 重启服务释放内存
pm2 restart clawlaunch-api
```

---

## 📊 性能优化建议

### 1. 调整缓存时间

编辑 `workers/api/src/index.ts`：

```typescript
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '600') // 10 分钟
```

### 2. 添加更多 RPC 节点

已在代码中配置多个备用 RPC 节点，无需修改。

### 3. 监控资源使用

定期运行 `bash monitor.sh` 检查资源使用情况。

### 4. 升级服务器（如果需要）

如果日活用户超过 5,000：
- 升级到 $10/月套餐（2 vCPU, 2 GB RAM）
- 或在 Vultr Dashboard 创建新 VPS，迁移数据

---

## 🔒 安全建议

### 1. 禁用 root 密码登录（可选）

```bash
# 生成 SSH key（在本地执行）
ssh-keygen -t ed25519

# 复制公钥到服务器
ssh-copy-id root@YOUR_SERVER_IP

# 禁用密码登录（在服务器上执行）
nano /etc/ssh/sshd_config
# 修改：PasswordAuthentication no
# 重启 SSH
systemctl restart sshd
```

### 2. 配置 Fail2ban

已自动安装，无需额外配置。

### 3. 定期更新系统

```bash
# 每周执行一次
apt update && apt upgrade -y
```

### 4. 备份数据

```bash
# 创建备份脚本
cat > /opt/backup.sh <<EOF
#!/bin/bash
tar -czf /opt/backup-\$(date +%Y%m%d).tar.gz /opt/longxia
# 保留最近 7 天的备份
find /opt -name "backup-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# 添加到 crontab（每天凌晨 2 点备份）
(crontab -l; echo "0 2 * * * /opt/backup.sh") | crontab -
```

---

## 💰 成本估算

### Vultr $5/月套餐

```
月度费用：$5
- 可支撑用户：5,000-8,000 日活
- 带宽：不限（公平使用政策）
- 存储：25 GB NVMe SSD

如果您的加密货币支付：
- BTC 网络费：$5-20（一次性）
- ETH 网络费：$2-50（波动大）
- LTC 网络费：$0.1-1（推荐）
- USDC (TRC20)：$1-3（推荐）

建议充值：$10-20（可用 2-4 个月）
```

---

## 📞 技术支持

### Vultr 官方支持
- 工单系统：https://my.vultr.com/support/
- 响应时间：2-24 小时
- 知识库：https://www.vultr.com/docs/

### 社区资源
- Stack Overflow: 搜索 "Vultr VPS"、"PM2"、"Nginx"
- YouTube: 搜索 "Deploy Node.js on Vultr"
- Reddit: r/Vultr

---

## 🎯 下一步

部署完成后：

1. ✅ 更新前端环境变量，指向新的 API 地址
2. ✅ 测试前端与后端的集成
3. ✅ 监控服务运行状态
4. ✅ 根据用户增长调整资源配置

**祝您部署顺利！** 🚀
