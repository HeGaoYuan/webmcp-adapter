#!/bin/bash

echo "🔍 验证 WebMCP 智能适配器生成器实现..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查文件是否存在
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (缺失)"
        return 1
    fi
}

# 统计
total=0
passed=0

echo "📁 核心分析模块:"
files=(
    "extension/analyzer/page-analyzer.js"
    "extension/analyzer/ref-manager.js"
    "extension/analyzer/tool-generator.js"
    "extension/analyzer/tool-executor.js"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if check_file "$file"; then
        passed=$((passed + 1))
    fi
done

echo ""
echo "🎨 用户界面:"
files=(
    "extension/ui/analysis-panel.html"
    "extension/ui/analysis-panel.js"
    "extension/options/options.html"
    "extension/options/options.js"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if check_file "$file"; then
        passed=$((passed + 1))
    fi
done

echo ""
echo "📝 文档:"
files=(
    "extension/analyzer/README.md"
    "extension/analyzer/TESTING.md"
    "IMPLEMENTATION-SUMMARY.md"
    "QUICK-START.md"
    "CHECKLIST.md"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if check_file "$file"; then
        passed=$((passed + 1))
    fi
done

echo ""
echo "⚙️  配置文件:"
files=(
    "extension/manifest.json"
    "extension/popup/popup.html"
    "extension/popup/popup.js"
    "extension/content/injector.js"
)
for file in "${files[@]}"; do
    total=$((total + 1))
    if check_file "$file"; then
        passed=$((passed + 1))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "📊 结果: ${GREEN}${passed}${NC}/${total} 文件存在"

if [ $passed -eq $total ]; then
    echo -e "${GREEN}✅ 所有文件都已创建！${NC}"
    echo ""
    echo "🚀 下一步:"
    echo "   1. 重新加载扩展: chrome://extensions/"
    echo "   2. 配置 AI API: 右键扩展图标 → 选项"
    echo "   3. 开始测试: 访问 mail.163.com"
    echo ""
    echo "📖 查看快速开始指南: cat QUICK-START.md"
else
    echo -e "${RED}❌ 有文件缺失，请检查！${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
