#!/usr/bin/env node
/**
 * 测试 WebSocket Bridge 是否正常工作
 * 运行: node native-host/test-bridge.js
 */

import { NativeMessagingBridge } from "./bridge.js";

console.log("Starting WebSocket Bridge test...");

const bridge = new NativeMessagingBridge();

bridge.on("tools_updated", () => {
  console.log("Tools updated!");
  console.log("Current tools:", bridge.getAllTools());
});

console.log("Bridge started. Waiting for extension to connect...");
console.log("Open Chrome extension and check if it connects.");

// 保持进程运行
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Bridge alive, tools count: ${bridge.getAllTools().length}`);
}, 5000);
