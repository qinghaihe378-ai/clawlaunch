#!/bin/bash

# Cloudflare 部署脚本
set -e

echo "🚀 开始部署到 Cloudflare..."

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler 未安装，正在安装..."
    npm install -g wrangler
fi

# 检查是否登录
if ! wrangler whoami &> /dev/null; then
    echo "🔐 请登录 Cloudflare..."
    wrangler login
fi

# 部署后端 API (Workers)
echo ""
echo "📦 部署后端 API..."
cd workers/api
npm install
npm run deploy
cd ../..

echo ""
echo "✅ 后端部署完成！"
echo "请记录 API URL，然后在 Cloudflare Pages 配置环境变量 VITE_API_BASE_URL"
echo ""
echo "下一步："
echo "1. 在 Cloudflare Dashboard 创建 Pages 项目"
echo "2. 连接 GitHub 仓库"
echo "3. 设置构建命令: npm run build"
echo "4. 设置输出目录: web/dist"
echo "5. 添加环境变量: VITE_API_BASE_URL=<你的Workers API URL>/api"
echo ""
