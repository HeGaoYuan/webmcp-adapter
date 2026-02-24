# Security Model

This page explains the security architecture of WebMCP Adapter, the known risks you should be aware of, and the mitigations in place.

## Trust Boundaries

WebMCP Adapter is composed of four layers, each with distinct trust levels:

```
Claude Desktop (MCP client)
    ↓  stdio  (local process, trusted)
native-host/mcp-server.js
    ↓  WebSocket ws://localhost:3711  (loopback only)
extension/background/service-worker.js
    ↓  chrome.scripting / chrome.runtime  (Chrome sandbox)
extension/adapters/{site}.js  (runs in Isolated World)
```

- **localhost only.** The WebSocket bridge binds to `127.0.0.1:3711`. No traffic ever leaves your machine through the core infrastructure.
- **Chrome Isolated World.** Adapter scripts run in Chrome's Isolated World — they can read and manipulate the DOM, but cannot access the host page's JavaScript variables or closures.
- **No telemetry.** WebMCP does not send usage data, email content, or any personal data to any remote server.

## Known Risks

### 1. Adapter Code Runs With Full DOM Access

**Risk level: High (by design)**

An installed adapter has complete read/write access to the DOM of its matched website. This means a malicious adapter could:
- Read all displayed content (including emails, messages, or other sensitive data)
- Exfiltrate data to an external server via `fetch()` or image beacon
- Modify content before you send it

**Mitigation:**
- Only install adapters from the official Hub or sources you trust and have reviewed
- The Hub adapters are open-source — you can read every line at `hub/adapters/{id}/index.js` before installing
- Adapter installation requires explicit CLI action (`node index.js adapter install`) — nothing installs automatically

### 2. Unencrypted Localhost WebSocket

**Risk level: Low in practice**

The bridge between the extension and the native host communicates over `ws://localhost:3711` without TLS. This is standard practice for localhost IPC, but it means:
- Other processes running on your machine can connect to this port
- Tool call payloads (which may include email content) are not encrypted in transit over loopback

**Mitigation:**
- The port binds to loopback (`127.0.0.1`) only, not to network interfaces
- Any attacker who can read loopback traffic already has deep OS-level access to your machine
- No authentication secret is currently required to connect — avoid running untrusted software alongside WebMCP on the same machine

### 3. Adapter Supply Chain

**Risk level: Medium (for community adapters)**

When you install an adapter from the Hub, you are trusting:
1. The GitHub repository is not compromised
2. The adapter author did not include malicious code
3. The Hub maintainers reviewed the adapter correctly

**Mitigation:**
- All Hub adapters are reviewed before merging
- Adapter code is human-readable JavaScript — review `index.js` before installing
- Install via `--file` from a local copy you've audited if you have concerns
- `verified_on` dates track when each adapter was last confirmed working and reviewed

### 4. AI Action Scope

**Risk level: Medium (operational)**

Claude or another MCP client can call any tool registered by an installed adapter. A confused or malicious AI instruction could cause unintended actions (sending emails, deleting data, etc.).

**Mitigation:**
- Supervise AI actions, especially on sites with write permissions (email, social media)
- Tools are scoped to individual browser tabs — an adapter for `mail.google.com` cannot affect other sites
- You can check which tools are active at any time via the extension popup

## Recommendations for Users

1. **Review adapter code before installing** — especially for adapters that access sensitive sites (email, banking, work tools).
2. **Don't run untrusted processes** on the same machine while WebMCP is active.
3. **Use the `--file` flag** to install from a local, audited copy rather than pulling directly from a URL.
4. **Check the popup** regularly to see which adapters are active and what tools they expose.
5. **Remove adapters you no longer use** with `node index.js adapter remove <id> --reload`.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it via [GitHub Issues](https://github.com/HeGaoYuan/webmcp-adapter/issues) with the label `security`. For sensitive reports, you may contact the maintainers directly through GitHub.
