#!/bin/bash

# ============================================
# Nginx 和 SSL 自动配置脚本
# 用途：配置反向代理和 Let's Encrypt SSL 证书
# 使用：bash setup-nginx.sh your-domain.com
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ -z "$1" ]; then
    log_error "请提供域名参数"
    echo "用法: bash setup-nginx.sh your-domain.com"
    exit 1
fi

DOMAIN=$1

log_info "=========================================="
log_info "  配置 Nginx 和 SSL 证书"
log_info "  域名: $DOMAIN"
log_info "=========================================="
echo ""

# 步骤 1: 创建 Nginx 配置
log_info "步骤 1/3: 创建 Nginx 配置..."

cat > /etc/nginx/sites-available/clawlaunch-api <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 日志文件
    access_log /var/log/nginx/clawlaunch-api-access.log;
    error_log /var/log/nginx/clawlaunch-api-error.log;

    # 反向代理到后端 API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://localhost:3001/api/health;
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/clawlaunch-api /etc/nginx/sites-enabled/

# 测试配置
nginx -t
log_success "Nginx 配置创建完成"
echo ""

# 步骤 2: 重启 Nginx
log_info "步骤 2/3: 重启 Nginx..."
systemctl restart nginx
systemctl enable nginx
log_success "Nginx 已启动并设置为开机自启"
echo ""

# 步骤 3: 配置 SSL 证书
log_info "步骤 3/3: 配置 Let's Encrypt SSL 证书..."
log_warning "请确保："
echo "  1. 域名 DNS 已指向此服务器 IP"
echo "  2. 端口 80 和 443 已开放"
echo ""
read -p "是否继续配置 SSL？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 获取 SSL 证书
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email
    
    log_success "SSL 证书配置完成！"
    echo ""
    
    # 配置自动续期
    log_info "配置证书自动续期..."
    (crontab -l 2>/dev/null; echo "0 0 1 * * certbot renew --quiet") | crontab -
    log_success "证书将在到期前自动续期"
else
    log_warning "跳过 SSL 配置"
    log_info "稍后可以运行: certbot --nginx -d $DOMAIN"
fi

echo ""
log_success "=========================================="
log_success "  配置完成！"
log_success "=========================================="
echo ""
log_info "您的后端 API 现在可以通过以下地址访问："
echo "  HTTP:  http://$DOMAIN"
echo "  HTTPS: https://$DOMAIN"
echo ""
log_info "测试 API："
echo "  curl https://$DOMAIN/api/health"
echo ""
