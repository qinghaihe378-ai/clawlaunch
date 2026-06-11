#!/bin/bash

echo "🚀 启动自动验证监听器..."
echo ""

# 检查是否已经在运行
if screen -list | grep -q "auto-verify"; then
    echo "⚠️  监听器已在运行！"
    echo "   如需重启，请先执行: screen -S auto-verify -X quit"
    exit 1
fi

# 启动监听器
cd "$(dirname "$0")/contracts"
screen -dmS auto-verify npx hardhat run scripts/autoVerifyTokens.ts --network bsc

# 等待一下确认启动
sleep 3

# 检查是否成功启动
if screen -list | grep -q "auto-verify"; then
    echo "✅ 自动验证监听器已成功启动（后台运行）"
    echo ""
    echo "📋 管理命令："
    echo "   查看日志: screen -r auto-verify"
    echo "   退出日志: Ctrl+A, 然后按 D"
    echo "   停止监听: screen -S auto-verify -X quit"
    echo "   查看状态: screen -list | grep auto-verify"
else
    echo "❌ 启动失败！请检查错误日志"
    exit 1
fi
