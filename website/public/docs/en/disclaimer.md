# Disclaimer

Please read this before using WebMCP Adapter.

## Nature of this software

WebMCP Adapter is an **experimental, open-source tool** provided as-is, without warranty of any kind. It is under active development and may contain bugs, security vulnerabilities, or unexpected behaviors.

## What the software does

WebMCP Adapter injects JavaScript into web pages you visit in Chrome and enables an AI client (such as Claude Desktop) to read content from and interact with those pages on your behalf. Actions taken by the AI are executed in your browser, using your active login sessions, with your account permissions.

## Risks and limitations

### Unintended actions

AI models can misinterpret instructions and perform unintended actions — deleting content, sending messages, or modifying data — on websites you have open. **You are responsible for supervising all AI-initiated actions.**

### Credential exposure (community adapters)

Community-contributed adapters are reviewed before merging, but **no guarantee is made** about the safety of any adapter. A malicious or buggy adapter could in principle read page content including displayed passwords, authentication tokens visible in the DOM, or personal information. Review adapters before using them, especially on sensitive sites.

### Website compatibility

Websites change their DOM structure frequently. An adapter that worked on a given date may break without notice. The `verified_on` field in each adapter's metadata indicates the last confirmed working date, but does not guarantee current functionality.

### No official affiliation

WebMCP Adapter is an independent open-source project. It is **not affiliated with, endorsed by, or supported by** Anthropic, Google, NetEase, or any other company whose products are mentioned or supported by adapters.

## Data and privacy

- All communication happens on `localhost`. **No user data is sent to any remote server by the core WebMCP infrastructure.**
- Individual adapters are subject to their own code. Always review an adapter's `index.js` before using it.
- WebMCP Adapter does not collect telemetry, analytics, or usage data.

## Limitation of liability

The authors and contributors of WebMCP Adapter are not liable for any direct, indirect, incidental, or consequential damages arising from the use of this software, including but not limited to data loss, account suspension, privacy breaches, or financial loss.

## Responsible use

You agree to use WebMCP Adapter only on accounts and websites you own or have explicit permission to automate. Using this tool to access, scrape, or interact with websites in violation of their Terms of Service is solely your responsibility.

## License

WebMCP Adapter is licensed under the [MIT License](https://github.com/HeGaoYuan/webmcp-adapter/blob/main/LICENSE). You are free to use, modify, and distribute it under the terms of that license.
