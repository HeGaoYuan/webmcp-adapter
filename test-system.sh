#!/bin/bash
# 系统测试脚本 - 验证WebMCP Adapter是否正常工作

set -e

echo "=== WebMCP Adapter 系统测试 ==="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 测试1：检查依赖
echo "测试1：检查依赖..."
if [ -d "node_modules" ]; then
    pass "node_modules 存在"
else
    fail "node_modules 不存在，请运行: npm install"
    exit 1
fi

if [ -d "node_modules/@modelcontextprotocol" ]; then
    pass "@modelcontextprotocol/sdk 已安装"
else
    fail "@modelcontextprotocol/sdk 未安装"
    exit 1
fi

if [ -d "node_modules/ws" ]; then
    pass "ws 已安装"
else
    fail "ws 未安装"
    exit 1
fi

echo ""

# 测试2：检查服务状态
echo "测试2：检查WebSocket服务..."
if ./start-service.sh status > /dev/null 2>&1; then
    pass "WebSocket服务正在运行"
    SERVICE_WAS_RUNNING=true
else
    warn "WebSocket服务未运行，正在启动..."
    ./start-service.sh start
    sleep 2
    if ./start-service.sh status > /dev/null 2>&1; then
        pass "WebSocket服务启动成功"
        SERVICE_WAS_RUNNING=false
    else
        fail "WebSocket服务启动失败"
        exit 1
    fi
fi

echo ""

# 测试3：检查端口
echo "测试3：检查端口3711..."
if lsof -i :3711 > /dev/null 2>&1; then
    pass "端口3711正在监听"
else
    fail "端口3711未监听"
    exit 1
fi

echo ""

# 测试4：测试WebSocket连接
echo "测试4：测试WebSocket连接..."
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3711');

ws.on('open', () => {
    console.log('✓ WebSocket连接成功');
    ws.close();
    process.exit(0);
});

ws.on('error', (err) => {
    console.log('✗ WebSocket连接失败:', err.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('✗ WebSocket连接超时');
    process.exit(1);
}, 5000);
"

if [ $? -eq 0 ]; then
    pass "WebSocket连接测试通过"
else
    fail "WebSocket连接测试失败"
    exit 1
fi

echo ""

# 测试5：检查Chrome扩展
echo "测试5：检查Chrome扩展连接..."
CONNECTIONS=$(./start-service.sh logs | grep "New connection" | wc -l | tr -d ' ')
if [ "$CONNECTIONS" -gt 0 ]; then
    pass "检测到 $CONNECTIONS 个连接"
else
    warn "未检测到Chrome扩展连接"
    echo "  请确保："
    echo "  1. Chrome扩展已加载"
    echo "  2. 已打开Gmail或163mail"
fi

echo ""

# 测试6：检查工具注册
echo "测试6：检查工具注册..."
TOOLS=$(./start-service.sh logs | grep "Registered.*tools" | tail -1)
if [ -n "$TOOLS" ]; then
    pass "工具已注册"
    echo "  $TOOLS"
else
    warn "未检测到工具注册"
    echo "  请在Chrome中打开Gmail或163mail"
fi

echo ""

# 测试7：检查Claude Desktop配置
echo "测试7：检查Claude Desktop配置..."
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CONFIG_FILE" ]; then
    pass "配置文件存在"
    if grep -q "webmcp-adapter" "$CONFIG_FILE"; then
        pass "webmcp-adapter已配置"
    else
        warn "webmcp-adapter未在配置中"
        echo "  请添加配置到: $CONFIG_FILE"
    fi
else
    warn "Claude Desktop配置文件不存在"
fi

echo ""

# 测试8：测试MCP模式
echo "测试8：测试MCP模式连接..."
timeout 5 node native-host/index.js <<EOF > /tmp/mcp-test.log 2>&1 &
{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
EOF

sleep 2

if grep -q "MCP Server started" /tmp/mcp-test.log 2>/dev/null; then
    pass "MCP模式启动成功"
else
    warn "MCP模式测试跳过（需要服务运行）"
fi

# 清理测试进程
pkill -f "node native-host/index.js" 2>/dev/null || true

echo ""
echo "=== 测试总结 ==="
echo ""

# 恢复服务状态
if [ "$SERVICE_WAS_RUNNING" = false ]; then
    echo "测试完成，保持服务运行"
fi

echo ""
echo "下一步："
echo "1. 确保WebSocket服务正在运行: ./start-service.sh status"
echo "2. 在Chrome中打开Gmail或163mail"
echo "3. 启动Claude Desktop"
echo "4. 测试工具: '请列出可用的工具'"
echo ""
echo "查看实时日志: ./start-service.sh logs -f"
