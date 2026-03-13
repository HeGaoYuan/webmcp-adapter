const esbuild = require('esbuild')
const path = require('path')

esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../../native-host/index.js')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: path.resolve(__dirname, '../build/bridge-dist/bridge.cjs'),
  define: {
    'import.meta.url': '__importMetaUrl',
    'import.meta.dirname': '__dirname',
  },
  banner: {
    js: 'const __importMetaUrl = require("url").pathToFileURL(__filename).href;',
  },
})

console.log('Bridge bundle created: build/bridge-dist/bridge.cjs')
