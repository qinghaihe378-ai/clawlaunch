# 🚀 Vultr VPS 全自动部署 - 只需复制粘贴一次！

## 📋 **操作步骤**

### 步骤 1：SSH 连接服务器

在您的 Mac 终端执行：

```bash
ssh root@144.202.55.254
```

输入密码后，看到 `root@vultr:~#` 说明连接成功。

---

### 步骤 2：复制粘贴以下完整命令

**直接复制下面这一整段（从 #!/bin/bash 到最后一行），粘贴到服务器终端，然后按回车：**

```bash
#!/bin/bash
set -e
echo " 开始全自动部署..."
apt update && apt upgrade -y
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban nodejs npm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
cd /opt
git clone https://github.com/qinghaihe378-ai/clawlaunch.git frontend
git clone https://github.com/qinghaihe378-ai/workflows-starter-template.git backend
cd /opt/frontend && npm install && npm run build
cd /opt/backend/server && npm install && npm run build
cat > /opt/backend/ecosystem.config.js << 'EOF'
module.exports = { apps: [{ name: 'clawlaunch-api', script: 'server/dist/app.js', instances: 1, autorestart: true, watch: false, max_memory_restart: '256M', env: { NODE_ENV: 'production', PORT: 3001 } }] }
EOF
cd /opt/backend && pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd -u root --hp /root
ufw default deny incoming && ufw allow ssh && ufw allow http && ufw allow https && ufw --force enable
cat > /etc/nginx/sites-available/clawlaunch << 'EOF'
server { listen 80; server_name 144.202.55.254; location / { root /opt/frontend/dist; try_files $uri $uri/ /index.html; } location /api/ { proxy_pass http://localhost:3001/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }
EOF
ln -sf /etc/nginx/sites-available/clawlaunch /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
echo "✅ 部署完成！访问 http://144.202.55.254"
```

---

### 步骤 3：等待完成（约 10-15 分钟）

脚本会自动完成所有配置，包括：
- ✅ 安装 Node.js、PM2、Nginx
- ✅ 克隆前端和后端代码
- ✅ 构建项目
- ✅ 配置防火墙
- ✅ 启动服务

**您只需要等待，无需任何操作！**

---

### 步骤 4：验证部署

完成后，测试 API：

```bash
curl http://144.202.55.254/api/health
```

应该返回：`{"code":200,"msg":"success","data":{"status":"ok"}}`

在浏览器中打开：`http://144.202.55.254`

应该看到 ClawLaunch 平台的前端页面。

---

## 🎉 **完成！**

就这么简单！只需 SSH 连接后复制粘贴一次命令即可！
