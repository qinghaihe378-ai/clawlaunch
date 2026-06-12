#!/bin/bash

# ============================================
# Vultr VPS 全自动终极部署脚本
# IP: 144.202.55.254
# 前端: https://github.com/qinghaihe378-ai/clawlaunch
# 后端: https://github.com/qinghaihe378-ai/workflows-starter-template
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
log_info "=========================================="
log_info "  🚀 ClawLaunch 全自动部署"
log_info "  IP: 144.202.55.254"
log_info "=========================================="
echo ""

# 步骤 1: 更新系统
log_info "步骤 1/12: 更新系统..."
apt update && apt upgrade -y
log_success "系统更新完成"

# 步骤 2: 安装基础依赖
log_info "步骤 2/12: 安装基础依赖..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban nodejs npm
log_success "基础依赖安装完成"

# 步骤 3: 安装 Node.js 20.x
log_info "步骤 3/12: 安装 Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
log_success "Node.js 20.x 安装完成 (版本: $(node -v))"

# 步骤 4: 安装 PM2
log_info "步骤 4/12: 安装 PM2..."
npm install -g pm2
log_success "PM2 安装完成"

# 步骤 5: 克隆前端代码
log_info "步骤 5/12: 克隆前端代码..."
cd /opt
if [ -d "frontend" ]; then
    log_warning "前端目录已存在，跳过克隆"
else
    git clone https://github.com/qinghaihe378-ai/clawlaunch.git frontend
fi
log_success "前端代码克隆完成"

# 步骤 6: 克隆后端代码
log_info "步骤 6/12: 克隆后端代码..."
if [ -d "backend" ]; then
    log_warning "后端目录已存在，跳过克隆"
else
    git clone https://github.com/qinghaihe378-ai/workflows-starter-template.git backend
fi
log_success "后端代码克隆完成"

# 步骤 7: 构建前端
log_info "步骤 7/12: 构建前端..."
cd /opt/frontend
npm install
npm run build
log_success "前端构建完成"

# 步骤 8: 构建后端
log_info "步骤 8/12: 构建后端..."
cd /opt/backend/server
npm install
npm run build
log_success "后端构建完成"

# 步骤 9: 创建 PM2 配置
log_info "步骤 9/12: 配置 PM2..."
cat > /opt/backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'clawlaunch-api',
    script: 'server/dist/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF
log_success "PM2 配置完成"

# 步骤 10: 启动后端服务
log_info "步骤 10/12: 启动后端服务..."
cd /opt/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
log_success "后端服务已启动"

# 步骤 11: 配置防火墙
log_info "步骤 11/12: 配置防火墙..."
ufw default deny incoming
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
log_success "防火墙配置完成"

# 步骤 12: 配置 Nginx
log_info "步骤 12/12: 配置 Nginx..."
cat > /etc/nginx/sites-available/clawlaunch << 'EOF'
server {
    listen 80;
    server_name 144.202.55.254;

    # 前端静态文件
    location / {
        root /opt/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # 后端 API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/clawlaunch /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
log_success "Nginx 配置完成"

# 显示完成信息
echo ""
log_success "=========================================="
log_success "  🎉 部署完成！"
log_success "=========================================="
echo ""
log_info "🌐 访问地址："
echo "   http://144.202.55.254"
echo ""
log_info "🧪 测试 API："
echo "   curl http://144.202.55.254/api/health"
echo ""
log_info "📊 监控服务："
echo "   pm2 status"
echo "   pm2 logs clawlaunch-api"
echo ""
log_info "🔄 更新代码："
echo "   cd /opt/frontend && git pull && npm run build"
echo "   cd /opt/backend && git pull && cd server && npm run build && pm2 restart all"
echo ""
log_warning "⚠️  重要提示："
echo "   1. 前端环境变量需要配置 VITE_API_URL=/api"
echo "   2. 如果需要 HTTPS，请配置域名后运行: certbot --nginx -d yourdomain.com"
echo "   3. 定期检查日志: pm2 logs clawlaunch-api"
echo ""
