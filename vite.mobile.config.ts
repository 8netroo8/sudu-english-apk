import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 手机版 Web 包：把渲染层和领域代码一起打成静态站点。
 * 两个别名把「主进程才有的东西」换成浏览器实现——这是移动端能复用 ~90% 代码的关键：
 *   better-sqlite3 → sql.js 垫片
 *   node:fs / node:path / node:crypto / node:os → 内存文件系统垫片
 */
const here = fileURLToPath(new URL('.', import.meta.url))
const shim = (file: string): string => fileURLToPath(new URL(file, import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

export default defineConfig({
  root: here,
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}-mobile`)
  },
  resolve: {
    alias: [
      { find: /^better-sqlite3$/, replacement: shim('./src/mobile/sqlite.ts') },
      { find: /^node:fs$/, replacement: shim('./src/mobile/node-shims/fs.ts') },
      { find: /^node:path$/, replacement: shim('./src/mobile/node-shims/path.ts') },
      { find: /^node:crypto$/, replacement: shim('./src/mobile/node-shims/crypto.ts') },
      { find: /^node:os$/, replacement: shim('./src/mobile/node-shims/os.ts') }
    ]
  },
  build: {
    outDir: 'out/mobile',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      // Capacitor 的 webDir 必须是 index.html 才能启动，所以入口模板直接叫 index.html。
      input: fileURLToPath(new URL('./index.html', import.meta.url))
    }
  },
  server: {
    port: 5199,
    // 手机和电脑在同一个 Wi-Fi 时，用 http://<电脑 IP>:5199 就能在真机上试用。
    host: true
  },
  preview: {
    port: 4199,
    host: true
  }
})
