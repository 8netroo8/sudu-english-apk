import type { IpcBridge } from '../shared/ipc-contract'

/**
 * 手机版没有 preload，`window.api` 由 src/mobile/host.ts 在启动时挂上去，
 * 形状与桌面版 preload 暴露的完全一致，界面层无需分支。
 */
declare global {
  interface Window {
    api: IpcBridge
  }
}

export {}
