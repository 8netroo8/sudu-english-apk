import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor 外壳配置：把 `vite.mobile.config.ts` 打出来的静态站点塞进 Android WebView。
 * webDir 里的东西全部是离线资源——语料、词典、sql.js wasm 都在包内。
 */
const config: CapacitorConfig = {
  appId: 'com.sudu.english',
  appName: '素读',
  webDir: 'out/mobile',
  android: {
    // 界面是本地资源，不需要混合内容；模型请求走 https 直连。
    allowMixedContent: false,
    captureInput: false
  },
  server: {
    androidScheme: 'https'
  }
}

export default config
