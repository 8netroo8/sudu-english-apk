/**
 * 移动端的「文件系统」：桌面版把语料、词典、数据库都放在磁盘上，
 * WebView 里没有 node:fs，所以这里用一张内存表代替磁盘。
 *
 * 启动时把随包的语料与词典塞进来（见 boot.ts），领域代码照旧同步读写，
 * 一行都不用改；真正的持久化只针对数据库字节（见 storage.ts）。
 */

type Entry = { bytes: Uint8Array; mtimeMs: number }

const files = new Map<string, Entry>()
const dirs = new Set<string>(['/'])

const decoder = new TextDecoder('utf-8')
const encoder = new TextEncoder()

/** 统一成 /a/b 形式，去掉多余的 . 与尾斜杠；Windows 风格反斜杠也收进来。 */
export function normalizePath(path: string): string {
  let value = path.replace(/\\/gu, '/')
  if (!value.startsWith('/')) {
    value = `/${value}`
  }
  const parts: string[] = []
  for (const part of value.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return `/${parts.join('/')}`
}

function ensureParentDirectories(path: string): void {
  const normalized = normalizePath(path)
  const parts = normalized.split('/').filter(Boolean)
  parts.pop()
  let current = ''
  for (const part of parts) {
    current += `/${part}`
    dirs.add(current)
  }
}

export function putTextFile(path: string, text: string): void {
  putBinaryFile(path, encoder.encode(text))
}

export function putBinaryFile(path: string, bytes: Uint8Array): void {
  const normalized = normalizePath(path)
  ensureParentDirectories(normalized)
  files.set(normalized, { bytes, mtimeMs: Date.now() })
}

export function hasFile(path: string): boolean {
  return files.has(normalizePath(path))
}

export function readBinary(path: string): Uint8Array {
  const entry = files.get(normalizePath(path))
  if (entry === undefined) {
    throw new Error(`文件不存在：${normalizePath(path)}`)
  }
  return entry.bytes
}

export function readText(path: string): string {
  return decoder.decode(readBinary(path))
}

export function listDirectory(path: string): string[] {
  const directory = normalizePath(path)
  const prefix = directory === '/' ? '/' : `${directory}/`
  const names: string[] = []
  for (const key of files.keys()) {
    if (!key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    if (rest === '' || rest.includes('/')) continue
    names.push(rest)
  }
  for (const key of dirs) {
    if (!key.startsWith(prefix)) continue
    const rest = key.slice(prefix.length)
    if (rest === '' || rest.includes('/')) continue
    const name = rest.split('/')[0] ?? ''
    if (name !== '' && !names.includes(name)) names.push(name)
  }
  return names.sort()
}

export function removePath(path: string, recursive: boolean): void {
  const normalized = normalizePath(path)
  const entry = files.get(normalized)
  if (entry !== undefined) {
    files.delete(normalized)
    return
  }
  const prefix = `${normalized}/`
  const victims = [...files.keys()].filter((key) => key.startsWith(prefix))
  if (victims.length > 0 && !recursive) {
    throw new Error(`目录不为空：${normalized}`)
  }
  for (const key of victims) files.delete(key)
  for (const key of [...dirs]) {
    if (key === normalized || key.startsWith(prefix)) dirs.delete(key)
  }
}

export function sizeOf(path: string): number {
  return readBinary(path).byteLength
}

let tempCounter = 0

export function makeTempDirectory(prefix: string): string {
  tempCounter += 1
  const path = normalizePath(`/tmp/${prefix}${Date.now().toString(36)}${tempCounter}`)
  dirs.add(path)
  return path
}

/** 「磁盘」上已经发生的变化：数据库写出时用来判断是否需要落盘。 */
export function snapshotCount(): number {
  return files.size
}

/* ------------------------------------------------------------------ */
/* node:fs 的替身：领域代码只用到下面这些同步函数。                       */
/* ------------------------------------------------------------------ */

export type WriteOptions = { encoding?: string } | string | undefined

export function readFileSync(path: string, encoding?: string): string | Uint8Array {
  const bytes = readBinary(path)
  if (typeof encoding === 'string') {
    return decoder.decode(bytes)
  }
  return bytes
}

export function writeFileSync(path: string, data: string | Uint8Array, _options?: WriteOptions): void {
  if (typeof data === 'string') {
    putTextFile(path, data)
    return
  }
  putBinaryFile(path, data)
}

export function existsSync(path: string): boolean {
  const normalized = normalizePath(path)
  return files.has(normalized) || dirs.has(normalized)
}

export function mkdirSync(path: string, options?: { recursive?: boolean } | string): void {
  const normalized = normalizePath(path)
  if (options === 'recursive' || (typeof options === 'object' && options?.recursive)) {
    ensureParentDirectories(`${normalized}/x`)
  }
  dirs.add(normalized)
}

export function mkdtempSync(prefix: string): string {
  return makeTempDirectory(prefix.replace(/\/+$/u, '').split('/').pop() ?? 'tmp')
}

export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
  const normalized = normalizePath(path)
  if (!files.has(normalized) && !dirs.has(normalized)) {
    if (options?.force) return
    throw new Error(`路径不存在：${normalized}`)
  }
  removePath(normalized, options?.recursive === true)
}

export function unlinkSync(path: string): void {
  rmSync(path, {})
}

export function copyFileSync(from: string, to: string): void {
  putBinaryFile(to, readBinary(from))
}

export function renameSync(from: string, to: string): void {
  const bytes = readBinary(from)
  putBinaryFile(to, bytes)
  removePath(from, false)
}

export function readdirSync(path: string): string[] {
  return listDirectory(path)
}

export function statSync(path: string): {
  size: number
  isFile: () => boolean
  isDirectory: () => boolean
  mtimeMs: number
} {
  const normalized = normalizePath(path)
  const entry = files.get(normalized)
  if (entry !== undefined) {
    return {
      size: entry.bytes.byteLength,
      isFile: () => true,
      isDirectory: () => false,
      mtimeMs: entry.mtimeMs
    }
  }
  if (dirs.has(normalized)) {
    return {
      size: 0,
      isFile: () => false,
      isDirectory: () => true,
      mtimeMs: Date.now()
    }
  }
  throw new Error(`路径不存在：${normalized}`)
}

/* ------------------------------------------------------------------ */
/* node:path / node:os / node:crypto 的替身                             */
/* ------------------------------------------------------------------ */

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter((part) => part !== '').join('/'))
}

export function resolvePath(...parts: string[]): string {
  return normalizePath(parts.filter((part) => part !== '').join('/'))
}

export function basenamePath(path: string, suffix?: string): string {
  const normalized = normalizePath(path)
  const name = normalized.split('/').pop() ?? ''
  return suffix !== undefined && name.endsWith(suffix)
    ? name.slice(0, name.length - suffix.length)
    : name
}

export function dirnamePath(path: string): string {
  const normalized = normalizePath(path)
  const parts = normalized.split('/').filter(Boolean)
  parts.pop()
  return `/${parts.join('/')}`
}

export function extnamePath(path: string): string {
  const name = basenamePath(path)
  const dot = name.lastIndexOf('.')
  return dot <= 0 ? '' : name.slice(dot)
}

export function tmpdirPath(): string {
  return '/tmp'
}

export function randomUuid(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi !== undefined && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
