/**
 * Adapter CLI — manage WebMCP adapters installed into the extension
 *
 * Usage:
 *   node index.js adapter install <id>                 # from Hub (CDN)
 *   node index.js adapter install --url <url>          # from custom URL (e.g. internal GitLab)
 *   node index.js adapter install --file <path>        # from local file
 *   node index.js adapter list                         # list installed adapters
 *   node index.js adapter remove <id>                  # remove adapter
 *
 * Options:
 *   --name <id>    Adapter id (filename without .js). Required for --url / --file
 *                  when the id cannot be inferred from the source.
 *   --reload       After install/remove, send a reload signal to the Chrome
 *                  extension via the running WebMCP service (ws://localhost:3711).
 */

import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import { WebSocket } from "ws";

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXTENSION_ADAPTERS_DIR = resolve(__dirname, "../extension/adapters");
// raw.githubusercontent.com: max-age=300（5分钟），内容变化后及时生效
// 不用 jsDelivr：其 max-age=604800（7天）不适合频繁变化的 registry
const HUB_REGISTRY_URL =
  "https://raw.githubusercontent.com/HeGaoYuan/webmcp-adapter/main/hub/registry.json";
const HUB_ADAPTER_BASE_URL =
  "https://raw.githubusercontent.com/HeGaoYuan/webmcp-adapter/main/hub/adapters";
const WS_PORT = 3711;

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function runAdapterCli(args) {
  const subcommand = args[0];

  switch (subcommand) {
    case "install":
      await cmdInstall(args.slice(1));
      break;
    case "list":
      await cmdList();
      break;
    case "remove":
    case "uninstall":
      await cmdRemove(args.slice(1));
      break;
    case "refresh":
      await cmdRefresh();
      break;
    default:
      printHelp();
  }
}

function printHelp() {
  console.log(`
WebMCP Adapter Manager

Usage:
  node index.js adapter install <id>                Install from Hub
  node index.js adapter install --url <url>         Install from URL (GitLab, etc.)
  node index.js adapter install --file <path>       Install from local file
  node index.js adapter list                        List installed adapters
  node index.js adapter remove <id>                 Remove adapter
  node index.js adapter refresh                     Force-refresh Hub registry cache

Options:
  --name <id>   Adapter id (used as filename: <id>.js).
                Auto-inferred from <id> or --file when possible.
                Required for --url if hostname is not the desired id.
  --reload      Send reload signal to Chrome extension via the running service.
                Falls back to a manual reminder if service is not running.

Examples:
  node index.js adapter install mail.163.com --reload
  node index.js adapter install --url https://gitlab.company.com/adapters/oa.js --name company.oa --reload
  node index.js adapter install --file ~/projects/my-adapter.js --name my.site.com
  node index.js adapter list
  node index.js adapter remove mail.163.com --reload
  node index.js adapter refresh
`);
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdInstall(args) {
  const reload = args.includes("--reload");
  const urlIdx = args.indexOf("--url");
  const fileIdx = args.indexOf("--file");
  const nameIdx = args.indexOf("--name");
  const explicitName = nameIdx !== -1 ? args[nameIdx + 1] : null;

  let adapterId, code;

  if (fileIdx !== -1) {
    // ── Source: local file ──
    const filePath = args[fileIdx + 1];
    if (!filePath) {
      die("--file requires a path argument");
    }
    const absPath = resolve(process.cwd(), filePath);
    if (!existsSync(absPath)) {
      die(`File not found: ${absPath}`);
    }
    adapterId = explicitName ?? inferIdFromPath(filePath);
    if (!adapterId) {
      die("Cannot infer adapter id from filename. Use --name <id> to specify.");
    }
    console.log(`Installing from local file: ${absPath}`);
    code = await readFile(absPath, "utf-8");

  } else if (urlIdx !== -1) {
    // ── Source: custom URL ──
    const url = args[urlIdx + 1];
    if (!url) {
      die("--url requires a URL argument");
    }
    adapterId = explicitName ?? inferIdFromUrl(url);
    if (!adapterId) {
      die(
        `Cannot infer adapter id from URL "${url}". Use --name <id> to specify.`
      );
    }
    console.log(`Installing from URL: ${url}`);
    code = await fetchText(url);

  } else {
    // ── Source: Hub (CDN) ──
    adapterId = explicitName ?? args.find((a) => !a.startsWith("--"));
    if (!adapterId) {
      die("Adapter id required.\nUsage: node index.js adapter install <id>");
    }
    await installFromHub(adapterId);
    // installFromHub writes the file itself; just handle --reload and return
    if (reload) {
      await reloadExtension();
    } else {
      console.log("→ Please reload the extension at chrome://extensions");
    }
    return;
  }

  await writeAdapter(adapterId, code);

  if (reload) {
    await reloadExtension();
  } else {
    console.log("→ Please reload the extension at chrome://extensions");
  }
}

async function cmdList() {
  if (!existsSync(EXTENSION_ADAPTERS_DIR)) {
    console.log("No adapters installed.");
    return;
  }
  const files = readdirSync(EXTENSION_ADAPTERS_DIR).filter((f) =>
    f.endsWith(".js")
  );
  if (files.length === 0) {
    console.log("No adapters installed.");
    return;
  }
  console.log("Installed adapters:");
  for (const f of files) {
    console.log(`  - ${f.replace(/\.js$/, "")}`);
  }
}

async function cmdRemove(args) {
  const reload = args.includes("--reload");
  const adapterId = args.find((a) => !a.startsWith("--"));

  if (!adapterId) {
    die("Adapter id required.\nUsage: node index.js adapter remove <id>");
  }

  const destPath = join(EXTENSION_ADAPTERS_DIR, `${adapterId}.js`);
  if (!existsSync(destPath)) {
    die(`Adapter "${adapterId}" is not installed.`);
  }

  rmSync(destPath);
  console.log(`✓ Adapter removed: ${adapterId}`);

  if (reload) {
    await reloadExtension();
  } else {
    console.log("→ Please reload the extension at chrome://extensions");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch a Hub adapter by id, verify against registry, write to extension/adapters/.
 */
async function installFromHub(adapterId) {
  // Verify adapter exists in registry
  try {
    const registry = await fetchJson(HUB_REGISTRY_URL);
    const meta = registry.adapters?.find((a) => a.id === adapterId);
    if (!meta) {
      const available = (registry.adapters ?? []).map((a) => `  - ${a.id} (${a.name})`).join("\n");
      die(`Adapter "${adapterId}" not found in Hub registry.\n\nAvailable adapters:\n${available}`);
    }
    console.log(`Installing "${adapterId}" (${meta.name}) from Hub...`);
  } catch (err) {
    if (err.message.startsWith("Adapter")) throw err; // re-throw our own errors
    console.warn(`Warning: could not fetch registry (${err.message}). Proceeding anyway...`);
    console.log(`Installing "${adapterId}" from Hub...`);
  }

  const hubUrl = `${HUB_ADAPTER_BASE_URL}/${adapterId}/index.js`;
  console.log(`  Source: ${hubUrl}`);
  const code = await fetchText(hubUrl);
  await writeAdapter(adapterId, code);
}

/**
 * Write adapter code to extension/adapters/<id>.js.
 */
async function writeAdapter(adapterId, code) {
  mkdirSync(EXTENSION_ADAPTERS_DIR, { recursive: true });
  const destPath = join(EXTENSION_ADAPTERS_DIR, `${adapterId}.js`);
  await writeFile(destPath, code, "utf-8");
  console.log(`✓ Adapter installed: extension/adapters/${adapterId}.js`);
}

/**
 * Force-clear the extension's registry cache and re-fetch from Hub.
 * Sends a refresh_registry message to the extension via the running service.
 */
async function cmdRefresh() {
  console.log("Refreshing Hub adapter registry...");
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    const timeout = setTimeout(() => {
      ws.terminate();
      console.warn(
        "Warning: WebMCP service is not running.\n" +
          "→ To refresh manually: reload the extension at chrome://extensions"
      );
      resolve();
    }, 3000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "refresh_registry" }));
      setTimeout(() => {
        clearTimeout(timeout);
        ws.close();
        console.log("✓ Refresh signal sent — extension will re-fetch registry shortly");
        resolve();
      }, 500);
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      console.warn(
        "Warning: WebMCP service is not running.\n" +
          "→ To refresh manually: reload the extension at chrome://extensions"
      );
      resolve();
    });
  });
}

/**
 * Send a reload_extension message to the Chrome extension via the bridge.
 * Gracefully falls back to a manual reminder if service is not running.
 */
async function reloadExtension() {
  process.stdout.write("Sending reload signal to Chrome extension... ");

  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    const timeout = setTimeout(() => {
      ws.terminate();
      console.log("");
      console.warn(
        "Warning: WebMCP service is not running.\n" +
          "→ Please reload the extension manually at chrome://extensions"
      );
      resolve();
    }, 3000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "reload_extension" }));
      // Give the message time to arrive, then close
      setTimeout(() => {
        clearTimeout(timeout);
        ws.close();
        console.log("done");
        console.log("✓ Extension reloading...");
        resolve();
      }, 500);
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      console.log("");
      console.warn(
        "Warning: WebMCP service is not running.\n" +
          "→ Please reload the extension manually at chrome://extensions"
      );
      resolve();
    });
  });
}

/**
 * Try to infer an adapter id from a URL.
 * e.g. "https://gitlab.company.com/adapters/oa.js" → null (ambiguous, user should specify --name)
 * e.g. "https://cdn.example.com/mail.163.com.js" → "mail.163.com"
 */
function inferIdFromUrl(url) {
  try {
    const u = new URL(url);
    const filename = u.pathname.split("/").pop();
    if (filename && filename.endsWith(".js")) {
      return filename.replace(/\.js$/, "");
    }
  } catch {}
  return null;
}

/**
 * Infer adapter id from a local file path.
 * e.g. "~/adapters/mail.163.com.js" → "mail.163.com"
 */
function inferIdFromPath(filePath) {
  const filename = filePath.split("/").pop();
  if (filename && filename.endsWith(".js")) {
    return filename.replace(/\.js$/, "");
  }
  return null;
}

/**
 * Fetch URL as text.
 * First tries native fetch (no proxy); on failure falls back to curl which
 * respects macOS/Linux system proxy settings and HTTPS_PROXY env vars.
 */
async function fetchText(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
    return resp.text();
  } catch {
    return fetchViaCurl(url);
  }
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchViaCurl(url) {
  try {
    // -sLf: silent, follow redirects, fail on HTTP errors
    const { stdout } = await execAsync(`curl -sLf --max-time 30 "${url}"`);
    return stdout;
  } catch (err) {
    throw new Error(
      `Network request failed: ${url}\n` +
      `  Node.js fetch and curl both failed. Common fixes:\n` +
      `  1. Set proxy env var:  export HTTPS_PROXY=http://127.0.0.1:<port>\n` +
      `  2. Or run curl manually to verify:  curl -v "${url}"\n` +
      `  curl error: ${err.stderr?.trim() || err.message}`
    );
  }
}

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}
