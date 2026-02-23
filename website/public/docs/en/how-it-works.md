# How It Works

A detailed walkthrough of the two core flows: **tool registration** and **tool calling**.

## Tool registration flow

When you open a supported website in Chrome, the following happens automatically:

```
1. Chrome loads the page
   ↓
2. injector.js (content script) checks the current domain
   ↓
3. If a matching adapter exists, injector.js loads it
   ↓
4. Adapter calls window.__webmcpRegister({ name, match, tools })
   ↓
5. injector.js sends the tool list to service-worker.js via chrome.runtime.sendMessage
   ↓
6. service-worker.js forwards the tool list to the WebSocket Service
   Message: { type: "tools_updated", tabId, tools }
   ↓
7. WebSocket Service stores tools indexed by tabId
   ↓
8. WebSocket Service broadcasts the update to all connected MCP clients
   Message: { type: "tools_updated", tabId, tools }
   ↓
9. MCP Process updates its tool registry and reports to Claude Desktop
```

The result: Claude Desktop sees the new tools and can call them in subsequent turns.

## Tool calling flow

When Claude decides to call a tool:

```
1. Claude Desktop sends a tool call request to the MCP Process (stdio)
   ↓
2. MCP Process sends a call request to the WebSocket Service
   Message: { type: "call_tool", id, tabId, toolName, args }
   ↓
3. WebSocket Service routes the request to the Chrome Extension's service-worker
   ↓
4. service-worker.js sends a message to the content script in the target tab
   ↓
5. injector.js finds the matching adapter and calls the tool's handler function
   handler({ param1, param2, ... })
   ↓
6. Handler performs DOM operations (click, read text, navigate, etc.)
   ↓
7. Handler returns a result object
   ↓
8. Result travels back: injector → service-worker → WebSocket Service → MCP Process → Claude Desktop
```

## WebSocket message types

### Extension → Service

```json
{ "type": "tools_updated", "tabId": 12345, "tools": [ /* Tool[] */ ] }
```

### Service → MCP Process

```json
// Broadcast on new tool registration
{ "type": "tools_updated", "tabId": 12345, "tools": [ /* Tool[] */ ] }

// Sent to a newly connected MCP client to synchronize current state
{ "type": "tools_snapshot", "tools": [ /* Tool[] */ ] }

// Successful tool call result
{ "type": "call_tool_result", "id": "req-abc", "result": { /* any */ } }

// Failed tool call
{ "type": "call_tool_error", "id": "req-abc", "error": "Timeout: .selector" }
```

### MCP Process → Service

```json
// Request tool execution
{
  "type": "call_tool",
  "id": "req-abc",
  "tabId": 12345,
  "toolName": "search_emails",
  "args": { "keyword": "invoice" }
}
```

## Timeout and error handling

- If no tools are registered within **15 seconds** of the MCP Process starting, it returns an empty tool list to Claude so the session isn't blocked.
- If a tool call takes longer than the configured timeout, the service returns a `call_tool_error` message.
- If the WebSocket Service is not running when the MCP Process starts, the process exits with a clear error message.
