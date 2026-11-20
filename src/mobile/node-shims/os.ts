/** `node:os` 的浏览器替身：临时目录落在内存文件系统的 /tmp 下。 */
export { tmpdirPath as tmpdir } from '../vfs'

export function homedir(): string {
  return '/home'
}

export function platform(): string {
  return 'web'
}
