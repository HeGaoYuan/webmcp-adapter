# WebMCP Adapter

Community-driven adapter that turns any website into an MCP tool server — without requiring the website to do anything.

**Architecture:**
```
Claude Desktop / Cline / Cursor
        │  stdio (MCP protocol)
        ▼
  native-host/index.js     ← MCP Server
        │  Chrome Native Messaging
        ▼
  extension/background/    ← Browser Extension
        │  chrome.tabs.sendMessage
        ▼
  extension/adapters/      ← Adapter Scripts (DOM tools)
        │  DOM manipulation
        ▼
     Website (Gmail, 163mail, ...)
```

## Installation

### 1. Install the browser extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Copy the **Extension ID** shown (e.g. `abcdefghijklmnopabcdefghijklmnop`)

### 2. Install dependencies

```bash
npm install
```

### 3. Register the native host

```bash
node native-host/install.js --extension-id YOUR_EXTENSION_ID_HERE
```

This registers the native messaging host so Chrome can communicate with the MCP server process.

### 4. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "webmcp-adapter": {
      "command": "node",
      "args": ["/absolute/path/to/webmcp-adapter/native-host/index.js"]
    }
  }
}
```

Restart Claude Desktop.

## Usage

1. Open Chrome and navigate to a supported website (Gmail or 163mail)
2. The extension automatically injects the adapter
3. In Claude Desktop, the website's tools are now available

**Example prompts:**
- "Search my Gmail for emails about invoices"
- "Get my unread emails from 163mail"
- "Compose an email to boss@company.com with subject 'Meeting tomorrow'"

## Supported Sites

| Site | Tools |
|------|-------|
| Gmail (`mail.google.com`) | `search_emails`, `get_unread_emails`, `compose_email`, `open_email` |
| 163 Mail (`mail.163.com`) | `search_emails`, `get_unread_emails`, `compose_email` |

## Adding Community Adapters

Create a new file in `extension/adapters/yourdomain.js`:

```javascript
export default {
  name: "my-site-adapter",
  match: ["example.com"],
  tools: [
    {
      name: "do_something",
      description: "Human-readable description for the AI",
      parameters: {
        type: "object",
        properties: {
          input: { type: "string", description: "What to do" }
        },
        required: ["input"]
      },
      handler: async ({ input }) => {
        // DOM manipulation here (runs in isolated world)
        const el = document.querySelector(".some-input");
        el.value = input;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return { status: "done" };
      }
    }
  ]
};
```

Then register it in [extension/content/injector.js](extension/content/injector.js):

```javascript
const ADAPTER_REGISTRY = [
  // ... existing entries ...
  { match: ["example.com"], src: "adapters/yourdomain.js" },
];
```

## Project Structure

```
webmcp-adapter/
├── extension/               # Module 1: Browser Extension (Chrome MV3)
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.js    # Native Messaging + tool registry
│   ├── content/
│   │   └── injector.js          # Loads adapters, handles tool calls
│   └── adapters/
│       ├── 163mail.js           # 163mail adapter
│       └── gmail.js             # Gmail adapter
├── native-host/             # Module 2: MCP Server + Native Messaging Bridge
│   ├── index.js                 # Entry point
│   ├── mcp-server.js            # MCP protocol (stdio transport)
│   ├── bridge.js                # Chrome Native Messaging bridge
│   └── install.js               # Registers native host with Chrome
└── package.json
```

## How It Works

1. **Extension loads**: Content script runs on every page, checks if the domain matches any adapter
2. **Tools registered**: Matching adapter's tools are loaded; tool metadata sent to background service worker
3. **MCP server starts**: `node native-host/index.js` runs as an MCP server via stdio
4. **AI calls a tool**: Claude Desktop → MCP stdio → native host → Native Messaging → extension background → content script → DOM → result returns up the chain
5. **User sees result**: Both in Claude Desktop (structured data) and in the browser (actual page interaction)

## Security Notes

- Adapters run in **isolated world** (cannot access page JavaScript variables)
- Tool handlers can only manipulate the current page's DOM
- `compose_email` and similar write operations never auto-submit — the user must confirm
- Native Messaging restricts which extension IDs can communicate with the native host
