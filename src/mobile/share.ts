import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * 把一份导出文件交给用户：浏览器里直接触发下载，手机上写到缓存目录再叫系统分享面板。
 * 返回 false 表示用户没接（或环境不支持），调用方据此把结果标成 cancelled。
 */
export async function saveFile(
  fileName: string,
  data: Uint8Array | string,
  mime: string
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return downloadInBrowser(fileName, data, mime)
  }
  try {
    if (typeof data === 'string') {
      await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      })
    } else {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Of(data),
        directory: Directory.Cache
      })
    }
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
    await Share.share({ title: fileName, url: uri, dialogTitle: '导出' })
    return true
  } catch {
    return false
  }
}

function downloadInBrowser(fileName: string, data: Uint8Array | string, mime: string): boolean {
  try {
    const blob =
      typeof data === 'string'
        ? new Blob([data], { type: mime })
        : new Blob([new Uint8Array(data)], { type: mime })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch {
    return false
  }
}

function base64Of(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}
