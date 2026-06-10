#!/bin/bash

# 防止误创建 Vercel 后端 API 目录的检查脚本
# 运行此脚本确保后端只在 Cloudflare Workers

echo " 检查是否有错误的 Vercel API 目录..."

ERRORS=0

# 检查根目录 api/ 文件夹
if [ -d "api" ]; then
    echo "❌ 错误：发现根目录 api/ 文件夹（后端应该在 workers/api/）"
    ERRORS=$((ERRORS + 1))
fi

# 检查 web/api/ 文件夹
if [ -d "web/api" ]; then
    echo "❌ 错误：发现 web/api/ 文件夹（Vercel 会识别为 Serverless Functions）"
    ERRORS=$((ERRORS + 1))
fi

# 检查 web/functions/ 文件夹
if [ -d "web/functions" ]; then
    echo "❌ 错误：发现 web/functions/ 文件夹（Vercel 会识别为 Serverless Functions）"
    ERRORS=$((ERRORS + 1))
fi

# 检查结果
if [ $ERRORS -eq 0 ]; then
    echo "✅ 检查通过：没有发现错误的 API 目录"
    exit 0
else
    echo ""
    echo "⚠️  发现 $ERRORS 个错误！"
    echo "   请删除这些文件夹："
    [ -d "api" ] && echo "   - rm -rf api/"
    [ -d "web/api" ] && echo "   - rm -rf web/api/"
    [ -d "web/functions" ] && echo "   - rm -rf web/functions/"
    echo ""
    echo "   后端应该在: workers/api/"
    exit 1
fi
