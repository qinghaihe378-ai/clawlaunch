#!/bin/bash
set -e

echo "=== 步骤 1: 更新系统和安装依赖 ==="
apt update && apt upgrade -y
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban nodejs npm

echo "=== 步骤 2: 安装 Node.js 20.x ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "=== 步骤 3: 安装 PM2 ==="
npm install -g pm2

echo "=== 步骤 4: 克隆代码仓库 ==="
cd /opt
rm -rf frontend backend
git clone https://github.com/qinghaihe378-ai/clawlaunch.git frontend
git clone https://github.com/qinghaihe378-ai/workflows-starter-template.git backend

echo "=== 步骤 5: 构建前端 ==="
cd /opt/frontend/web
npm install
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo "=== 步骤 6: 构建后端 ==="
cd /opt/backend/server
npm install
npm run build

echo "=== 步骤 7: 创建 PM2 配置并启动服务 ==="
cat > /opt/backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'clawlaunch-api',
    script: 'server/dist/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF

cd /opt/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

echo "=== 步骤 8: 配置防火墙 ==="
ufw default deny incoming
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

echo "=== 步骤 9: 配置 Nginx ==="
cat > /etc/nginx/sites-available/clawlaunch << 'EOF'
server {
    listen 80;
    server_name 144.202.55.254;
    
    location / {
        root /opt/frontend/web/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/clawlaunch /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

echo ""
echo "✅ 部署完成！访问 http://144.202.55.254"
echo ""
