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

// ─── Service mode (WebSocket bridge only) ────────────────────────────────────

async function runServiceMode() {
  const { NativeMessagingBridge } = await import("./bridge.js");

  process.stderr.write("[WebMCP] Starting WebSocket bridge...\n");
  const bridge = new NativeMessagingBridge();

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

  process.stderr.write("[WebMCP] Starting MCP server...\n");

  const running = await checkPortListening();
  if (!running) {
    process.stderr.write("[WebMCP] ERROR: WebSocket service is not running!\n");
    process.stderr.write("[WebMCP] Start it first: webmcp service start -d\n");
    process.exit(1);
  }

  const bridge = new RemoteBridge();
  await bridge.connect();
  process.stderr.write("[WebMCP] Connected to WebSocket service\n");

  const mcpServer = new McpServer(bridge);
  await mcpServer.start();
  process.stderr.write("[WebMCP] MCP server ready\n");
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

// ─── RemoteBridge (MCP mode only) ─────────────────────────────────────────────

class RemoteBridge {
  constructor() {
    this.ws = null;
    this.toolRegistry = new Map();
    this._pendingRequests = new Map();
    this._requestCounter = 0;
    this._listeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://localhost:${WS_PORT}`);

      this.ws.on("open", () => {
        process.stderr.write("[RemoteBridge] Connected to service\n");
        resolve();
      });

      this.ws.on("message", (data) => {
        try { this._handleMessage(JSON.parse(data.toString())); }
        catch (e) { process.stderr.write(`[RemoteBridge] Parse error: ${e.message}\n`); }
      });

      this.ws.on("close", () => {
        process.stderr.write("[RemoteBridge] Disconnected\n");
        process.exit(1);
      });

      this.ws.on("error", (e) => {
        process.stderr.write(`[RemoteBridge] Error: ${e.message}\n`);
        reject(e);
      });
    });
  }

  _handleMessage(msg) {
    if (msg.type === "tools_updated") {
      const { tabId, tools } = msg;
      if (!tools?.length) {
        this.toolRegistry.delete(tabId);
        process.stderr.write(`[RemoteBridge] Cleared tools for tab ${tabId}\n`);
      } else {
        this.toolRegistry.set(tabId, tools.map(t => ({ ...t, tabId })));
        process.stderr.write(`[RemoteBridge] ${tools.length} tools registered for tab ${tabId}\n`);
      }
      this._emit("tools_updated");
      return;
    }

    if (msg.type === "tools_snapshot") {
      this.toolRegistry.clear();
      for (const tool of msg.tools) {
        const id = tool.tabId;
        if (!this.toolRegistry.has(id)) this.toolRegistry.set(id, []);
        this.toolRegistry.get(id).push(tool);
      }
      process.stderr.write(`[RemoteBridge] Snapshot: ${msg.tools.length} tools\n`);
      this._emit("tools_updated");
      return;
    }

    const pending = this._pendingRequests.get(msg.id);
    if (!pending) return;
    this._pendingRequests.delete(msg.id);

    if      (msg.type === "call_tool_result")       pending.resolve(msg.result);
    else if (msg.type === "call_tool_error")         pending.reject(new Error(msg.error));
    else if (msg.type === "get_active_tab_result")   pending.resolve(msg.tabId);
    else if (msg.type === "get_active_tab_error")    pending.reject(new Error(msg.error));
  }

  _send(msg) {
    if (!this.ws || this.ws.readyState !== 1) throw new Error("Not connected");
    this.ws.send(JSON.stringify(msg));
  }

  _request(msg, timeout = 10_000) {
    const id = String(++this._requestCounter);
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(id, { resolve, reject });
      this._send({ ...msg, id });
      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id);
          reject(new Error(`Request "${msg.type}" timed out`));
        }
      }, timeout);
    });
  }

  getAllTools()              { return [...this.toolRegistry.values()].flat(); }
  getActiveTabId()          { return this._request({ type: "get_active_tab" }); }
  callTool(tabId, name, a)  { return this._request({ type: "call_tool", tabId, toolName: name, args: a }); }
  openBrowser(url)          { return this._request({ type: "open_browser", url }); }

  on(e, fn)   { (this._listeners.get(e) ?? (this._listeners.set(e, []), this._listeners.get(e))).push(fn); }
  _emit(e)    { this._listeners.get(e)?.forEach(fn => fn()); }
}

main().catch(e => {
  process.stderr.write(`[WebMCP] Fatal: ${e.message}\n`);
  process.exit(1);
});
