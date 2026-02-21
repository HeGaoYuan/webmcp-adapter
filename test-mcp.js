#!/usr/bin/env node
/**
 * 测试 MCP Server 是否能正确响应
 * 
 * 这个脚本模拟 Claude Desktop 的行为，通过 stdio 与 MCP server 通信
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting MCP server test...\n');

// 启动 MCP server
const serverPath = join(__dirname, 'native-host', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
});

let buffer = '';
let requestId = 0;

// 处理服务器响应
server.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // 尝试解析 JSON-RPC 消息
  const lines = buffer.split('\n');
  buffer = lines.pop(); // 保留不完整的行
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const msg = JSON.parse(line);
      console.log('← Server:', JSON.stringify(msg, null, 2));
      
      // 如果收到 initialize 响应，发送 initialized 通知
      if (msg.id === 0 && msg.result) {
        sendNotification('notifications/initialized', {});
        
        // 然后请求工具列表
        setTimeout(() => {
          sendRequest('tools/list', {});
        }, 500);
      }
      
      // 如果收到工具列表，显示并退出
      if (msg.result && msg.result.tools !== undefined) {
        console.log('\n✓ Tool list received:');
        console.log(`  Total tools: ${msg.result.tools.length}`);
        msg.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
        
        setTimeout(() => {
          server.kill();
          process.exit(0);
        }, 1000);
      }
      
      // 如果收到 list_changed 通知
      if (msg.method === 'notifications/tools/list_changed') {
        console.log('\n✓ Received tools/list_changed notification');
        console.log('  Requesting tool list again...');
        sendRequest('tools/list', {});
      }
      
    } catch (err) {
      // 不是有效的 JSON，忽略
    }
  }
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);
  process.exit(code);
});

// 发送请求
function sendRequest(method, params) {
  const id = requestId++;
  const msg = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };
  console.log('→ Client:', JSON.stringify(msg));
  server.stdin.write(JSON.stringify(msg) + '\n');
}

// 发送通知
function sendNotification(method, params) {
  const msg = {
    jsonrpc: '2.0',
    method,
    params,
  };
  console.log('→ Client:', JSON.stringify(msg));
  server.stdin.write(JSON.stringify(msg) + '\n');
}

// 发送 initialize 请求
setTimeout(() => {
  sendRequest('initialize', {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  });
}, 1000);

// 超时保护
setTimeout(() => {
  console.error('\n✗ Test timeout after 30 seconds');
  server.kill();
  process.exit(1);
}, 30000);
