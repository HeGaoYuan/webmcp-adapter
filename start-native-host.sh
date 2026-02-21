#!/bin/bash
# Native Host 启动脚本
# 用于 Claude Desktop MCP 配置

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 启动 native host
exec node native-host/index.js
