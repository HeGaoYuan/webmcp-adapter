#!/bin/bash

echo "=== WebMCP Adapter 诊断工具 ==="
echo ""

echo "1. 检查 Node.js 版本..."
node --version
echo ""

echo "2. 检查依赖是否安装..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules 存在"
    if [ -d "node_modules/@modelcontextprotocol" ]; then
        echo "✓ @modelcontextprotocol/sdk 已安装"
    else
        echo "✗ @modelcontextprotocol/sdk 未安装"
    fi
    if [ -d "node_modules/ws" ]; then
        echo "✓ ws 已安装"
    else
        echo "✗ ws 未安装"
    fi
else
    echo "✗ node_modules 不存在，请运行 npm install"
fi
echo ""

echo "3. 检查端口 3711 是否被占用..."
if lsof -i :3711 > /dev/null 2>&1; then
    echo "✗ 端口 3711 已被占用:"
    lsof -i :3711
else
    echo "✓ 端口 3711 可用"
fi
echo ""

echo "4. 检查是否有残留的 native-host 进程..."
PROCESSES=$(ps aux | grep "node.*webmcp-adapter/native-host/index.js" | grep -v grep)
if [ -n "$PROCESSES" ]; then
    echo "✗ 发现残留进程:"
    echo "$PROCESSES"
    echo ""
    echo "建议运行: pkill -f 'node.*webmcp-adapter/native-host/index.js'"
else
    echo "✓ 没有残留进程"
fi
echo ""

echo "5. 检查 Claude Desktop 配置..."
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CONFIG_PATH" ]; then
    echo "✓ 配置文件存在"
    if grep -q "webmcp-adapter" "$CONFIG_PATH"; then
        echo "✓ webmcp-adapter 已配置"
        echo "配置内容:"
        cat "$CONFIG_PATH" | grep -A 5 "webmcp-adapter"
    else
        echo "✗ webmcp-adapter 未在配置中"
    fi
else
    echo "✗ Claude Desktop 配置文件不存在"
fi
echo ""

echo "=== 诊断完成 ==="
echo ""
echo "建议的调试步骤:"
echo "1. 如果有残留进程，先清理: pkill -f 'node.*webmcp-adapter/native-host/index.js'"
echo "2. 手动启动 native host 测试: node native-host/index.js"
echo "3. 在另一个终端查看 Chrome 扩展的 Service Worker 日志"
echo "4. 检查 Claude Desktop 的日志: ~/Library/Logs/Claude/mcp*.log"
