import { spawn } from 'child_process'
import { Socket } from 'net'
import path from 'path'
import { fileURLToPath } from 'url'
import { app, utilityProcess } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class BridgeManager {
  constructor(log) {
    this._process = null
    this._status = 'stopped'
    this._log = log || console.log
  }

  async start() {
    this._status = 'starting'

    let cmd, args
    if (!app.isPackaged) {
      cmd = 'node'
      args = [path.resolve(__dirname, '../../native-host/index.js'), 'service', 'start']
      this._process = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      })
      this._process.stdout.on('data', (d) => this._log(`[bridge] ${d.toString().trimEnd()}`))
      this._process.stderr.on('data', (d) => this._log(`[bridge] ${d.toString().trimEnd()}`))
      this._process.on('exit', (code) => {
        this._status = code === 0 ? 'stopped' : 'error'
        this._log(`[bridge] exited with code ${code}`)
      })
    } else {
      // Use Electron's utilityProcess to run bridge.cjs in a Node.js context
      const bridgeScript = path.join(process.resourcesPath, 'bridge', 'bridge.cjs')
      this._process = utilityProcess.fork(bridgeScript, ['service', 'start'], {
        stdio: 'pipe',
      })
      this._process.stdout.on('data', (d) => this._log(`[bridge] ${d.toString().trimEnd()}`))
      this._process.stderr?.on('data', (d) => this._log(`[bridge] ${d.toString().trimEnd()}`))
      this._process.on('exit', (code) => {
        this._status = code === 0 ? 'stopped' : 'error'
        this._log(`[bridge] exited with code ${code}`)
      })
    }

    try {
      await waitForPort(3711, 10000)
      this._status = 'running'
      this._log('[bridge] running on port 3711')
    } catch {
      this._status = 'error'
      this._log('[bridge] failed to start (port 3711 not ready)')
    }
  }

  async stop() {
    if (this._process) {
      try { this._process.kill('SIGTERM') } catch { this._process.kill() }
      this._process = null
    }
    this._status = 'stopped'
  }

  getStatus() {
    return this._status
  }
}

export class PythonManager {
  constructor(log, logFile) {
    this._process = null
    this._status = 'stopped'
    this._log = log || console.log
    this._logFile = logFile || ''
  }

  async start() {
    this._status = 'starting'
    const backendDir = path.resolve(__dirname, '../backend')

    let cmd, args, cwd
    // In packaged app, use bundled binary; in dev, use system python3
    if (app.isPackaged) {
      const exeName = process.platform === 'win32' ? 'wework-backend.exe' : 'wework-backend'
      cmd = path.join(process.resourcesPath, 'backend', exeName)
      args = []
      cwd = path.join(process.resourcesPath, 'backend')
    } else {
      // Prefer anaconda python if available, fall back to system python3
      const { execFileSync } = await import('child_process')
      const candidates = [
        '/opt/homebrew/anaconda3/bin/python3',
        '/usr/local/anaconda3/bin/python3',
        'python3',
      ]
      cmd = 'python3'
      for (const c of candidates) {
        try { execFileSync(c, ['--version'], { stdio: 'ignore' }); cmd = c; break } catch {}
      }
      args = [path.join(backendDir, 'main.py')]
      cwd = backendDir
    }

    this._log(`[python] starting: ${cmd}`)
    this._process = spawn(cmd, args, {
      cwd,
      env: { ...process.env, WEWORK_PORT: '8765', WEWORK_LOG_FILE: this._logFile },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    this._process.on('error', (err) => this._log(`[python] spawn error: ${err.message}`))

    this._process.stdout.on('data', (d) => this._log(`[python] ${d.toString().trimEnd()}`))
    this._process.stderr.on('data', (d) => this._log(`[python] ${d.toString().trimEnd()}`))
    this._process.on('exit', (code) => {
      this._status = code === 0 ? 'stopped' : 'error'
      this._log(`[python] exited with code ${code}`)
    })

    try {
      await waitForHttp('http://127.0.0.1:8765/status', 20000)
      this._status = 'running'
      this._log('[python] backend running on port 8765')
    } catch {
      this._status = 'error'
      this._log('[python] failed to start (http://127.0.0.1:8765/status not ready)')
    }
  }

  async stop() {
    if (this._process) {
      this._process.kill('SIGTERM')
      this._process = null
    }
    this._status = 'stopped'
  }

  getStatus() {
    return this._status
  }
}

function waitForPort(port, timeout) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout
    const attempt = () => {
      const sock = new Socket()
      sock.once('connect', () => { sock.destroy(); resolve() })
      sock.once('error', () => {
        sock.destroy()
        if (Date.now() > deadline) return reject(new Error('timeout'))
        setTimeout(attempt, 300)
      })
      sock.connect(port, '127.0.0.1')
    }
    attempt()
  })
}

async function waitForHttp(url, timeout) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Timeout waiting for ${url}`)
}
