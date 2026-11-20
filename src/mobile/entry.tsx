/**
 * 手机版入口。与桌面版 main.tsx 的唯一区别：渲染之前先把「本地宿主」拉起来，
 * 让 window.api 先存在——界面层不需要知道自己跑在 Electron 还是 WebView 里。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { resolveTheme } from '../shared/types'
import { App } from '../renderer/src/App'
import { startMobileHost } from './host'
import '../renderer/src/styles/tokens.css'
import '../renderer/src/styles/app.css'
import '../renderer/src/styles/entries.css'
import '../renderer/src/styles/dictionary.css'
import '../renderer/src/styles/library.css'
import '../renderer/src/styles/reading.css'
import '../renderer/src/styles/article-words.css'
import '../renderer/src/styles/settings.css'
import '../renderer/src/styles/mobile.css'

document.documentElement.dataset.theme = resolveTheme(
  'system',
  window.matchMedia('(prefers-color-scheme: dark)').matches
)

const found = document.getElementById('root')
if (!found) {
  throw new Error('缺少 #root 挂载点')
}
const container: HTMLElement = found

function showFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  container.innerHTML = ''
  const box = document.createElement('div')
  box.className = 'boot boot-error'
  const title = document.createElement('h1')
  title.textContent = '启动失败'
  const detail = document.createElement('p')
  detail.textContent = message
  const hint = document.createElement('p')
  hint.textContent = '可以刷新页面重试；如果一直失败，请把上面的信息发回来。'
  box.append(title, detail, hint)
  container.append(box)
}

async function boot(): Promise<void> {
  try {
    if (!window.api) {
      await startMobileHost()
    }
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (error) {
    console.error(error)
    showFailure(error)
  }
}

void boot()
