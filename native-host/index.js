#!/usr/bin/env node
/**
 * WebMCP Adapter — CLI entry point
 *
 * Commands:
 *   webmcp service start [-d]   Start WebSocket bridge (foreground or daemon)
 *   webmcp service stop         Stop background service
 *   webmcp service status       Show service status
 *   webmcp service logs [-f]    View service logs
 *
 *   webmcp mcp                  Start MCP server (use in Claude Desktop config)
 *
 *   webmcp adapter <...>        Manage adapters (install / list / remove / refresh)
 *   webmcp extension-path       Print bundled extension directory
 *
 *   webmcp --version            Show version
 *   webmcp --help               Show help
 */

import { spawn } from "child_process";
import { openSync, existsSync } from "fs";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const WS_PORT    = 3711;
const WEBMCP_DIR = join(homedir(), ".webmcp");
const PID_FILE   = join(WEBMCP_DIR, "service.pid");
const LOG_FILE   = join(WEBMCP_DIR, "service.log");

// ─── Help & version ──────────────────────────────────────────────────────────

const HELP = `
webmcp <command> [options]

Service:
  service start [-d, --daemon]   Start WebSocket bridge (background with -d)
  service stop                   Stop background service
  service status                 Show service status
  service logs [-f, --follow]    Show service logs

MCP server (for Claude Desktop):
  mcp                            Start MCP server over stdio
  mcp-logs [-f, --follow]        Show MCP server logs

Adapters:
  adapter list                             List installed adapters
  adapter install <id>  [--reload]         Install from Hub
  adapter install --url <url> [--reload]   Install from URL (https only)
  adapter install --file <path> [--reload] Install from local file
  adapter remove  <id>  [--reload]         Remove adapter
  adapter refresh                          Refresh Hub registry cache

Extension:
  extension-path                 Print the bundled extension directory

Options:
  -v, --version    Show version
  -h, --help       Show this help

Claude Desktop config:
  { "command": "webmcp", "args": ["mcp"] }
`.trim();

async function printVersion() {
  try {
    const pkgPath = join(__dirname, "../package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    console.log(`webmcp ${pkg.version}`);
  } catch {
    console.log("webmcp (unknown version)");
  }
}

// ─── Service helpers ──────────────────────────────────────────────────────────

async function checkPortListening() {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    const t = setTimeout(() => { ws.terminate(); resolve(false); }, 2000);
    ws.on("open",  () => { clearTimeout(t); ws.close(); resolve(true);  });
    ws.on("error", () => { clearTimeout(t);              resolve(false); });
  });
}

async function readPid() {
  try { return parseInt(await readFile(PID_FILE, "utf8"), 10); }
  catch { return null; }
}

function isPidRunning(pid) {
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

// ─── Command: service start ──────────────────────────────────────────────────

async function cmdServiceStart(daemon) {
  if (daemon) {
    await mkdir(WEBMCP_DIR, { recursive: true });

    // Check if already running
    const existing = await readPid();
    if (existing && isPidRunning(existing)) {
      console.log(`WebMCP service is already running (PID: ${existing})`);
      return;
    }

    const logFd  = openSync(LOG_FILE, "a");
    const child  = spawn(process.execPath, [__filename, "--service"], {
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });
    child.unref();
    await writeFile(PID_FILE, String(child.pid));

    console.log(`✓ WebMCP service started in background (PID: ${child.pid})`);
    console.log(`  Logs:   ${LOG_FILE}`);
    console.log(`  Stop:   webmcp service stop`);
    console.log(`  Status: webmcp service status`);
  } else {
    // Foreground — hand off to service mode
    await runServiceMode();
  }
}

// ─── Command: service stop ───────────────────────────────────────────────────

async function cmdServiceStop() {
  const pid = await readPid();
  if (!pid) {
    console.log("WebMCP service is not running (no PID file found)");
    return;
  }
  if (!isPidRunning(pid)) {
    console.log(`PID ${pid} is no longer running — cleaning up stale PID file`);
    await unlink(PID_FILE).catch(() => {});
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
    await unlink(PID_FILE).catch(() => {});
    console.log(`✓ WebMCP service stopped (PID: ${pid})`);
  } catch (e) {
    console.error(`Failed to stop service: ${e.message}`);
  }
}

// ─── Command: service status ─────────────────────────────────────────────────

async function cmdServiceStatus() {
  const listening = await checkPortListening();
  const pid = await readPid();
  const pidRunning = pid ? isPidRunning(pid) : false;

  if (listening) {
    const pidStr = pidRunning ? ` (PID: ${pid})` : "";
    console.log(`✓ WebMCP service is running on ws://localhost:${WS_PORT}${pidStr}`);
  } else {
    console.log("✗ WebMCP service is not running");
    if (pid && !pidRunning) {
      console.log("  (stale PID file found — run 'webmcp service stop' to clean up)");
    }
    console.log("  Start with: webmcp service start -d");
  }
}

// ─── Command: service logs ───────────────────────────────────────────────────

async function cmdServiceLogs(follow) {
  if (!existsSync(LOG_FILE)) {
    console.log(`No log file found at ${LOG_FILE}`);
    console.log("Start the service first: webmcp service start -d");
    return;
  }
  if (follow) {
    const tail = spawn("tail", ["-f", LOG_FILE], { stdio: "inherit" });
    process.on("SIGINT", () => { tail.kill(); process.exit(0); });
    await new Promise(() => {}); // keep alive
  } else {
    process.stdout.write(await readFile(LOG_FILE, "utf8"));
  }
}

// ─── Command: mcp logs ───────────────────────────────────────────────────────

async function cmdMcpLogs(follow) {
  const { readdirSync } = await import("fs");

  try {
    const files = readdirSync(WEBMCP_DIR)
      .filter(f => f.startsWith("mcp-") && f.endsWith(".log"))
      .map(f => ({ name: f, path: join(WEBMCP_DIR, f) }))
      .sort((a, b) => b.name.localeCompare(a.name)); // 最新的在前

    if (files.length === 0) {
      console.log(`No MCP log files found in ${WEBMCP_DIR}`);
      console.log("MCP logs are created when 'webmcp mcp' is started by an AI client.");
      return;
    }

    const latestLog = files[0].path;
    console.log(`Showing latest MCP log: ${latestLog}\n`);

    if (follow) {
      const tail = spawn("tail", ["-f", latestLog], { stdio: "inherit" });
      process.on("SIGINT", () => { tail.kill(); process.exit(0); });
      await new Promise(() => {}); // keep alive
    } else {
      process.stdout.write(await readFile(latestLog, "utf8"));
    }
  } catch (err) {
    console.error(`Error reading MCP logs: ${err.message}`);
  }
}

// ─── Service mode (WebSocket bridge only) ────────────────────────────────────

async function runServiceMode() {
  const { WebSocketBridge } = await import("./bridge.js");

  process.stderr.write("[WebMCP] Starting WebSocket bridge...\n");
  const bridge = new WebSocketBridge();

  await new Promise(resolve => setTimeout(resolve, 500));
  process.stderr.write(`[WebMCP] WebSocket server listening on ws://localhost:${WS_PORT}\n`);
  process.stderr.write("[WebMCP] Waiting for Chrome extension to connect...\n");

  setInterval(() => {
    process.stderr.write(`[WebMCP] Alive — ${bridge.getAllTools().length} tools registered\n`);
  }, 60_000);
}

// ─── MCP mode (connects to running bridge) ────────────────────────────────────

async function runMcpMode() {
  const { McpServer } = await import("./mcp-server.js");
  const { createLogger } = await import("./logger.js");

  // 初始化双重日志
  const logger = createLogger("WebMCP");
  await logger.init();

  logger.log("Starting MCP server...");

  const running = await checkPortListening();
  if (!running) {
    logger.log("ERROR: WebSocket service is not running!");
    logger.log("Start it first: webmcp service start -d");
    process.exit(1);
  }

  const bridge = new WebSocketClient(logger);
  await bridge.connect();
  logger.log("Connected to WebSocket service");

  const mcpServer = new McpServer(bridge, logger);
  await mcpServer.start();
  logger.log("MCP server ready");
  logger.log(`Log file: ${logger.getLogPath()}`);

  // 优雅关闭
  process.on("SIGTERM", () => {
    logger.log("Received SIGTERM, shutting down...");
    logger.close();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.log("Received SIGINT, shutting down...");
    logger.close();
    process.exit(0);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd  = args[0];
  const sub  = args[1];

  // --version / -v
  if (cmd === "--version" || cmd === "-v") {
    await printVersion();
    return;
  }

  // --help / -h / no command
  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }

  // extension-path
  if (cmd === "extension-path") {
    console.log(new URL("../extension", import.meta.url).pathname);
    return;
  }

  // adapter <...>
  if (cmd === "adapter") {
    const { runAdapterCli } = await import("./adapter-cli.js");
    await runAdapterCli(args.slice(1));
    return;
  }

  // service <start|stop|status|logs>
  if (cmd === "service") {
    if (!sub || sub === "start") {
      const daemon = args.includes("-d") || args.includes("--daemon");
      await cmdServiceStart(daemon);
    } else if (sub === "stop") {
      await cmdServiceStop();
    } else if (sub === "status") {
      await cmdServiceStatus();
    } else if (sub === "logs") {
      const follow = args.includes("-f") || args.includes("--follow");
      await cmdServiceLogs(follow);
    } else {
      console.error(`Unknown service subcommand: ${sub}`);
      console.log('Available: start, stop, status, logs');
      process.exit(1);
    }
    return;
  }

  // mcp — explicit MCP server start (used in Claude Desktop config)
  if (cmd === "mcp") {
    process.on("uncaughtException",  e => process.stderr.write(`[WebMCP] ${e.message}\n`));
    process.on("unhandledRejection", r => process.stderr.write(`[WebMCP] ${r}\n`));
    await runMcpMode();
    return;
  }

  // mcp-logs — view MCP server logs
  if (cmd === "mcp-logs") {
    const follow = args.includes("-f") || args.includes("--follow");
    await cmdMcpLogs(follow);
    return;
  }

  // --service (internal flag used by daemon spawn)
  if (cmd === "--service") {
    process.on("uncaughtException",  e => process.stderr.write(`[WebMCP] ${e.message}\n`));
    process.on("unhandledRejection", r => process.stderr.write(`[WebMCP] ${r}\n`));
    await runServiceMode();
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  console.log('Run "webmcp --help" for usage.');
  process.exit(1);
}

// ─── WebSocketClient (MCP mode only) ─────────────────────────────────────────────

class WebSocketClient {
  constructor(logger = null) {
    this.ws = null;
    this.toolRegistry = new Map(); // domain -> { tools, tabCount }
    this._pendingRequests = new Map();
    this._requestCounter = 0;
    this._listeners = new Map();
    this.logger = logger;
  }

  _log(message) {
    if (this.logger) {
      this.logger.log(message);
    } else {
      process.stderr.write(`[WebSocketClient] ${message}\n`);
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${WS_PORT}`);

      this.ws.on("open", () => {
        this._log("Connected to service");
        resolve();
      });

      this.ws.on("message", (data) => {
        try { this._handleMessage(JSON.parse(data.toString())); }
        catch (e) { this._log(`Parse error: ${e.message}`); }
      });

      this.ws.on("close", () => {
        this._log("Disconnected");
        process.exit(1);
      });

      this.ws.on("error", (e) => {
        this._log(`Error: ${e.message}`);
        reject(e);
      });
    });
  }

  _handleMessage(msg) {
    if (msg.type === "tools_updated") {
      const { domain, tools, tabCount } = msg;
      if (!tools?.length) {
        this.toolRegistry.delete(domain);
        this._log(`← WebSocket: tools_updated (domain ${domain} cleared)`);
      } else {
        this.toolRegistry.set(domain, { tools, tabCount });
        this._log(`← WebSocket: tools_updated (domain ${domain})`);
        this._log(`  Registered ${tools.length} tools (${tabCount} tabs): ${tools.map(t => t.name).join(", ")}`);
      }
      this._emit("tools_updated");
      return;
    }

    if (msg.type === "tools_snapshot") {
      this.toolRegistry.clear();
      for (const tool of msg.tools) {
        const domain = tool.domain;
        if (!this.toolRegistry.has(domain)) {
          this.toolRegistry.set(domain, { tools: [], tabCount: tool.tabCount ?? 1 });
        }
        this.toolRegistry.get(domain).tools.push(tool);
      }
      this._log(`← WebSocket: tools_snapshot (${msg.tools.length} tools total)`);

      // 按域名分组显示
      const domainGroups = new Map();
      for (const tool of msg.tools) {
        if (!domainGroups.has(tool.domain)) domainGroups.set(tool.domain, []);
        domainGroups.get(tool.domain).push(tool.name);
      }
      for (const [domain, toolNames] of domainGroups) {
        const domainData = this.toolRegistry.get(domain);
        this._log(`  Domain ${domain} (${domainData.tabCount} tabs): ${toolNames.join(", ")}`);
      }

      this._emit("tools_updated");
      return;
    }

    const pending = this._pendingRequests.get(msg.id);
    if (!pending) return;
    this._pendingRequests.delete(msg.id);

    if (msg.type === "call_tool_result") {
      this._log(`← WebSocket: call_tool_result (request ${msg.id})`);
      pending.resolve(msg.result);
    } else if (msg.type === "call_tool_error") {
      this._log(`← WebSocket: call_tool_error (request ${msg.id}): ${msg.error}`);
      pending.reject(new Error(msg.error));
    } else if (msg.type === "get_active_tab_result") {
      this._log(`← WebSocket: get_active_tab_result (tab ${msg.tabId})`);
      pending.resolve(msg.tabId);
    } else if (msg.type === "get_active_tab_error") {
      this._log(`← WebSocket: get_active_tab_error: ${msg.error}`);
      pending.reject(new Error(msg.error));
    }
  }

  _send(msg) {
    if (!this.ws || this.ws.readyState !== 1) throw new Error("Not connected");
    this.ws.send(JSON.stringify(msg));
  }

  _request(msg, timeout = 10_000) {
    const id = String(++this._requestCounter);
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });
      this._log(`→ WebSocket: ${msg.type} (request ${id})`);
      this._send({ ...msg, id });
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id);
          this._log(`  Request ${id} timed out after ${timeout}ms`);
          reject(new Error(`Request "${msg.type}" timed out`));
        }
      }, timeout);
    });
  }

  getAllTools() {
    const all = [];
    for (const [domain, domainData] of this.toolRegistry.entries()) {
      for (const tool of domainData.tools) {
        all.push({ ...tool, domain, tabCount: domainData.tabCount });
      }
    }
    return all;
  }
  getActiveTabId()          { return this._request({ type: "get_active_tab" }); }
  callTool(name, a)         { return this._request({ type: "call_tool", toolName: name, args: a }); }
  openBrowser(url)          { return this._request({ type: "open_browser", url }); }

  on(e, fn)   { (this._listeners.get(e) ?? (this._listeners.set(e, []), this._listeners.get(e))).push(fn); }
  _emit(e)    { this._listeners.get(e)?.forEach(fn => fn()); }
}

main().catch(e => {
  process.stderr.write(`[WebMCP] Fatal: ${e.message}\n`);
  process.exit(1);
});
