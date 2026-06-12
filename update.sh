#!/bin/bash

# ============================================
# 代码更新脚本
# 用途：从 Git 仓库拉取最新代码并重启服务
# 使用：bash update.sh
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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "=========================================="
log_info "  更新 ClawLaunch 后端"
log_info "=========================================="
echo ""

# 进入项目目录
cd /opt/longxia

# 拉取最新代码
log_info "步骤 1/4: 拉取最新代码..."
git pull
log_success "代码更新完成"
echo ""

# 安装依赖
log_info "步骤 2/4: 安装依赖..."
cd workers/api
npm install
log_success "依赖安装完成"
echo ""

# 构建
log_info "步骤 3/4: 构建项目..."
npm run build
log_success "构建完成"
echo ""

# 重启服务
log_info "步骤 4/4: 重启服务..."
pm2 restart clawlaunch-api
sleep 3
log_success "服务已重启"
echo ""

# 检查服务状态
log_info "检查服务状态..."
pm2 status clawlaunch-api
echo ""

log_success "=========================================="
log_success "  更新完成！"
log_success "=========================================="
