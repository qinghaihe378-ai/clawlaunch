# 🚀 全自动部署命令 - 直接复制粘贴即可！

## 📋 **操作步骤**

### 步骤 1：打开终端，SSH 连接服务器

```bash
ssh root@144.202.55.254
```

当提示输入密码时，输入：**F+4nWc,pS4mVLRN-**

（粘贴密码时不会显示任何字符，这是正常的）

看到 `root@vultr:~#` 说明连接成功。

---

### 步骤 2：复制以下完整命令并粘贴到服务器终端

**选中下面从 `apt update` 开始到最后一行 `echo "✅ 部署完成..."` 的所有内容，复制后粘贴到服务器终端：**

```bash
apt update && apt upgrade -y && apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban nodejs npm && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs && npm install -g pm2 && cd /opt && git clone https://github.com/qinghaihe378-ai/clawlaunch.git frontend && git clone https://github.com/qinghaihe378-ai/workflows-starter-template.git backend && cd /opt/frontend && npm install && npm run build && cd /opt/backend/server && npm install && npm run build && cat > /opt/backend/ecosystem.config.js << 'EOF'
module.exports = { apps: [{ name: 'clawlaunch-api', script: 'server/dist/app.js', instances: 1, autorestart: true, watch: false, max_memory_restart: '256M', env: { NODE_ENV: 'production', PORT: 3001 } }] }
EOF
&& cd /opt/backend && pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd -u root --hp /root && ufw default deny incoming && ufw allow ssh && ufw allow http && ufw allow https && ufw --force enable && cat > /etc/nginx/sites-available/clawlaunch << 'EOF'
server { listen 80; server_name 144.202.55.254; location / { root /opt/frontend/dist; try_files $uri $uri/ /index.html; } location /api/ { proxy_pass http://localhost:3001/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }
EOF
&& ln -sf /etc/nginx/sites-available/clawlaunch /etc/nginx/sites-enabled/ && nginx -t && systemctl restart nginx && echo "✅ 部署完成！访问 http://144.202.55.254"
```

---

### 步骤 3：等待 10-15 分钟

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

应该返回：
```json
{"code":200,"msg":"success","data":{"status":"ok"}}
```

在浏览器中打开：
```
http://144.202.55.254
```

应该看到 ClawLaunch 平台的前端页面。

---

## 🎉 **完成！**

就这么简单！只需：
1. SSH 连接（输入密码 F+4nWc,pS4mVLRN-）
2. 复制粘贴上面的长命令
3. 等待完成

**现在就开始吧！** 🚀
