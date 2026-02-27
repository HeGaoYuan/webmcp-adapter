/**
 * Tool Generator
 * 
 * 使用 AI 分析可操作树，生成候选工具
 */

class ToolGenerator {
  constructor(apiConfig = {}) {
    this.apiConfig = {
      provider: apiConfig.provider || 'claude',
      apiKey: apiConfig.apiKey || '',
      model: apiConfig.model || 'claude-3-5-sonnet-20241022',
      ...apiConfig
    };
    
    // 回调函数
    this.onAIRequest = null;
    this.onAIResponse = null;
  }

  /**
   * 分析页面并生成工具
   * @param {Object} analysisResult - PageAnalyzer 的分析结果
   * @returns {Promise<Array>} 候选工具列表
   */
  async generateTools(analysisResult) {
    try {
      const { pageInfo, interactiveElements } = analysisResult;

      // 构建 AI 提示词
      const prompt = this.buildPrompt(pageInfo, interactiveElements);
      
      // 触发请求回调
      if (this.onAIRequest) {
        this.onAIRequest(prompt);
      }

      // 调用 AI API
      const response = await this.callAI(prompt);
      
      // 触发响应回调
      if (this.onAIResponse) {
        this.onAIResponse(response);
      }

      // 解析 AI 响应
      const tools = this.parseAIResponse(response);

      // 按置信度排序
      tools.sort((a, b) => b.confidence - a.confidence);

      // 只返回前 3 个最有信心的工具
      return tools.slice(0, 3);
    } catch (error) {
      console.error('[ToolGenerator] Failed to generate tools:', error);
      throw error;
    }
  }

  /**
   * 构建 AI 提示词
   */
  buildPrompt(pageInfo, interactiveElements) {
    const elementsSummary = this.summarizeElements(interactiveElements);

    return `你是一个网页适配器生成专家。请分析以下网页的交互元素，识别最常用的操作模式，并生成 2-3 个高级工具。

网页信息：
- URL: ${pageInfo.url}
- 标题: ${pageInfo.title}
- 域名: ${pageInfo.domain}

交互元素：
${elementsSummary}

请生成 2-3 个最有用的工具，每个工具应该：
1. 有清晰的名称（格式：动词_对象，如 search_emails, get_inbox_list）
2. 有简洁的描述
3. 明确需要使用哪些元素（通过 ref 引用）
4. 定义需要的参数（使用标准 JSON Schema 格式）
5. 给出置信度评分（0-1）

请以 JSON 格式返回，格式如下：
\`\`\`json
[
  {
    "name": "search_emails",
    "description": "搜索邮件",
    "elements": ["e1", "e2"],
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "搜索关键词"
        }
      },
      "required": ["query"]
    },
    "confidence": 0.95,
    "reasoning": "页面有明显的搜索框和搜索按钮"
  }
]
\`\`\`

注意：
- 只生成最核心、最常用的工具
- 优先考虑搜索、导航、获取列表等高频操作
- 确保工具名称符合网站的实际功能
- parameters 必须使用标准 JSON Schema 格式（type: "object", properties, required）
- 置信度要基于元素的清晰度和完整性`;
  }

  /**
   * 总结交互元素
   */
  summarizeElements(interactiveElements) {
    const lines = [];

    for (const [category, elements] of Object.entries(interactiveElements)) {
      if (elements.length === 0) continue;

      lines.push(`\n${this.getCategoryName(category)}：`);
      
      for (const el of elements.slice(0, 10)) { // 最多显示 10 个
        lines.push(`  [${el.ref}] ${el.label || el.type} (${el.role})`);
        if (el.description) {
          lines.push(`      描述: ${el.description}`);
        }
      }

      if (elements.length > 10) {
        lines.push(`  ... 还有 ${elements.length - 10} 个元素`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取分类名称
   */
  getCategoryName(category) {
    const names = {
      search: '搜索框',
      navigation: '导航链接',
      actions: '操作按钮',
      lists: '列表',
      forms: '表单',
      inputs: '输入框'
    };
    return names[category] || category;
  }

  /**
   * 调用 AI API
   */
  async callAI(prompt) {
    const { provider, apiKey, model } = this.apiConfig;

    if (!apiKey) {
      throw new Error('AI API key not configured');
    }

    if (provider === 'claude') {
      return this.callClaudeAPI(prompt, apiKey, model);
    } else if (provider === 'openai') {
      return this.callOpenAIAPI(prompt, apiKey, model);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * 调用 Claude API
   */
  async callClaudeAPI(prompt, apiKey, model) {
    const baseUrl = this.apiConfig.baseUrl || 'https://api.anthropic.com';
    const url = `${baseUrl}/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * 调用 OpenAI API
   */
  async callOpenAIAPI(prompt, apiKey, model) {
    const baseUrl = this.apiConfig.baseUrl || 'https://api.openai.com';
    const url = `${baseUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * 解析 AI 响应
   */
  parseAIResponse(response) {
    try {
      // 提取 JSON 代码块
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;

      const tools = JSON.parse(jsonStr);

      // 验证并修复工具格式
      return tools.map(tool => this.normalizeToolFormat(tool)).filter(tool => tool !== null);
    } catch (error) {
      console.error('[ToolGenerator] Failed to parse AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * 标准化工具格式
   */
  normalizeToolFormat(tool) {
    if (!this.validateTool(tool)) {
      return null;
    }

    // 修复 parameters 格式
    if (tool.parameters) {
      tool.parameters = this.normalizeParameters(tool.parameters);
    } else {
      // 如果没有 parameters，添加一个空的
      tool.parameters = {
        type: 'object',
        properties: {},
        required: []
      };
    }

    return tool;
  }

  /**
   * 标准化参数格式为 JSON Schema
   */
  normalizeParameters(params) {
    // 如果已经是正确的格式（有 type: "object"），直接返回
    if (params.type === 'object' && params.properties) {
      return params;
    }

    // 否则，转换为正确的格式
    const properties = {};
    const required = [];

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'object' && value.type) {
        // 提取属性定义
        const prop = {
          type: value.type,
          description: value.description || ''
        };

        // 处理 enum
        if (value.enum) {
          prop.enum = value.enum;
        }

        // 处理 default
        if (value.default !== undefined) {
          prop.default = value.default;
        }

        properties[key] = prop;

        // 处理 required
        if (value.required === true) {
          required.push(key);
        }
      }
    }

    return {
      type: 'object',
      properties,
      required
    };
  }

  /**
   * 验证工具格式
   */
  validateTool(tool) {
    return (
      tool.name &&
      typeof tool.name === 'string' &&
      tool.description &&
      Array.isArray(tool.elements) &&
      tool.elements.length > 0 &&
      typeof tool.confidence === 'number'
    );
  }
}

// 导出为全局可用
if (typeof window !== 'undefined') {
  window.ToolGenerator = ToolGenerator;
}
