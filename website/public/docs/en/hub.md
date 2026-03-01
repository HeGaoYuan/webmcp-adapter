# Hub

The Hub is the central repository for WebMCP Adapters, used to store and distribute adapters.

## Purpose of the Hub

The Hub is the core component of the WebMCP ecosystem, providing:

1. **Adapter Discovery** — Lets the extension and websites automatically discover available adapters
2. **Adapter Distribution** — Provides a source for the `webmcp` CLI to download and install adapters
3. **Centralized Management** — Unified management of all community-contributed adapters

## Hub Usage

The Hub is used by the following components:

| Component | Purpose | Configuration Method |
|-----------|---------|---------------------|
| **CLI** | Download and install adapters | `WEBMCP_HUB` environment variable |
| **Chrome Extension** | Detect available adapters for current website | Popup configuration, stored in `chrome.storage.local` |
| **Website** | Display adapter list and details | Reads from local `/hub` path |

## Hub Directory Structure

```
hub/
├── registry.json          # Central registry listing all available adapters
└── adapters/             # Adapter code directory
    ├── mail.163.com/   # One folder per adapter
    │   ├── index.js
    │   ├── meta.json
    │   ├── README.md
    │   └── README.zh.md
    └── mail.google.com/
        ├── index.js
        ├── meta.json
        ├── README.md
        └── README.zh.md
```

### registry.json

```json
{
  "version": 1,
  "updated_at": "2026-02-24T08:15:35Z",
  "adapters": [
    {
      "id": "mail.163.com",
      "name": "163 Mail",
      "description": "NetEase 163 Mail: read emails, search, open messages, download attachments",
      "author": "webmcp-team",
      "match": ["mail.163.com"],
      "version": "2026-02-22T00:00:00Z",
      "verified_on": "2026-02-22",
      "homepage": "https://github.com/HeGaoYuan/webmcp-adapter/tree/main/hub/adapters/mail.163.com"
    }
  ]
}
```

Field descriptions:
- `id` — Unique adapter identifier, typically the main domain
- `match` — Array of matching domain patterns, supports subdomains
- `version` — Last publication time (ISO 8601 format)
- `verified_on` — Last date the adapter was verified to work on the actual website

## Configuring a Custom Hub

### CLI Configuration

Set the `WEBMCP_HUB` environment variable to point to your Hub address:

```bash
# Official Hub (default)
# export WEBMCP_HUB="https://webmcphub.dev"

# GitHub repository
export WEBMCP_HUB="https://github.com/HeGaoYuan/webmcp-adapter"

# Enterprise private deployment
export WEBMCP_HUB="https://hub.company.com"

# Internal GitLab
export WEBMCP_HUB="https://gitlab.company.com/user/repo"
```

Once configured, the CLI will automatically fetch from that Hub:
- `registry.json` — The adapter registry
- `adapters/{id}/index.js` — Adapter code

### Chrome Extension Configuration

Configure a custom Hub through the extension Popup:

1. Click the extension icon to open the Popup
2. Click the ⚙️ settings button in the top-right corner
3. Enter your Hub address (supports the formats below)
4. Click "Save Configuration"

**Supported Hub address formats:**
- `https://webmcphub.dev` — Official Hub
- `https://github.com/HeGaoYuan/webmcp-adapter` — GitHub repository
- `https://hub.company.com` — Enterprise private deployment
- `https://gitlab.company.com/user/repo` — Internal GitLab

After configuration, the extension will:
- Automatically fetch the adapter list from `${HUB_URL}/hub/registry.json`
- Detect if an available adapter matches the current website URL
- Prompt users to install available adapters

## Security Considerations

⚠️ **Custom Hubs Present Security Risks**

When using a custom Hub, please note:

1. **Only trust known sources** — Ensure the Hub is maintained by you or your organization
2. **Verify adapter code** — Review adapter code to ensure it contains no malicious logic
3. **Regular audits** — Periodically review new adapters added to the Hub

A malicious Hub could:
- Inject harmful code into the browser
- Exfiltrate sensitive user information
- Perform unauthorized actions

## Related Documentation

- [Adapter](/docs/adapter) — Learn how adapters work
- [Writing an Adapter](/docs/writing-an-adapter) — How to create a new adapter
- [CLI Reference](/docs/cli-reference) — Complete CLI command documentation
