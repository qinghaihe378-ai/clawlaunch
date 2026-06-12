#!/bin/bash

# ============================================
# 监控和维护脚本
# 用途：监控服务状态、自动重启、日志清理
# 使用：bash monitor.sh
# ============================================

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

echo ""
log_info "=========================================="
log_info "  ClawLaunch 后端监控面板"
log_info "=========================================="
echo ""

# 1. 检查 PM2 服务状态
log_info "1. 服务状态："
pm2 status clawlaunch-api
echo ""

# 2. 检查内存使用
log_info "2. 内存使用："
MEMORY_USAGE=$(pm2 jlist | grep -o '"monit":[^}]*' | grep -o '"memory":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ ! -z "$MEMORY_USAGE" ]; then
    MEMORY_MB=$((MEMORY_USAGE / 1024 / 1024))
    if [ $MEMORY_MB -gt 200 ]; then
        log_warning "内存使用: ${MEMORY_MB} MB (接近限制 256 MB)"
    else
        log_success "内存使用: ${MEMORY_MB} MB"
    fi
else
    log_error "无法获取内存使用信息"
fi
echo ""

# 3. 检查 CPU 使用
log_info "3. CPU 使用："
CPU_USAGE=$(pm2 jlist | grep -o '"monit":[^}]*' | grep -o '"cpu":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ ! -z "$CPU_USAGE" ]; then
    if [ $CPU_USAGE -gt 80 ]; then
        log_warning "CPU 使用: ${CPU_USAGE}% (较高)"
    else
        log_success "CPU 使用: ${CPU_USAGE}%"
    fi
else
    log_error "无法获取 CPU 使用信息"
fi
echo ""

# 4. 检查运行时间
log_info "4. 运行时间："
UPTIME=$(pm2 jlist | grep -o '"pm_uptime":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ ! -z "$UPTIME" ]; then
    UPTIME_DAYS=$((UPTIME / 86400))
    UPTIME_HOURS=$(( (UPTIME % 86400) / 3600 ))
    log_success "已运行: ${UPTIME_DAYS} 天 ${UPTIME_HOURS} 小时"
else
    log_error "无法获取运行时间"
fi
echo ""

# 5. 检查磁盘空间
log_info "5. 磁盘空间："
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log_warning "磁盘使用: ${DISK_USAGE}% (较高)"
else
    log_success "磁盘使用: ${DISK_USAGE}%"
fi
echo ""

# 6. 检查 Nginx 状态
log_info "6. Nginx 状态："
if systemctl is-active --quiet nginx; then
    log_success "Nginx: 运行中"
else
    log_error "Nginx: 未运行"
fi
echo ""

# 7. 检查端口监听
log_info "7. 端口监听："
if netstat -tuln | grep -q ':3001'; then
    log_success "端口 3001: 正在监听"
else
    log_error "端口 3001: 未监听"
fi

if netstat -tuln | grep -q ':80'; then
    log_success "端口 80: 正在监听"
else
    log_warning "端口 80: 未监听"
fi

if netstat -tuln | grep -q ':443'; then
    log_success "端口 443: 正在监听"
else
    log_warning "端口 443: 未监听 (SSL 可能未配置)"
fi
echo ""

# 8. 最近的错误日志
log_info "8. 最近 10 条错误日志："
pm2 logs clawlaunch-api --lines 10 --err
echo ""

# 9. 快速操作菜单
echo ""
log_info "=========================================="
log_info "  快速操作"
log_info "=========================================="
echo "1. 重启服务: pm2 restart clawlaunch-api"
echo "2. 查看实时日志: pm2 logs clawlaunch-api"
echo "3. 停止服务: pm2 stop clawlaunch-api"
echo "4. 清理日志: bash cleanup-logs.sh"
echo "5. 更新代码: bash update.sh"
echo ""
