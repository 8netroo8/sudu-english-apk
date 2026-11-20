/**
 * 移动端的持久化与随包资源装载。
 *
 * - 语料：构建时把 docs/corpus 的 JSON 以字符串打进包里，启动时塞进虚拟文件系统。
 * - 词典：ecdict.db 作为静态资源随包，启动时 fetch 成字节再塞进虚拟文件系统。
 * - 资料库：SQLite 字节存 IndexedDB（WebView 里同一个 origin，删应用才会丢）。
 */
import { putBinaryFile, putTextFile, readBinary } from './vfs'

const corpusModules = import.meta.glob('../../docs/corpus/*.json', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const dictionaryModules = import.meta.glob('../../assets/dictionary/ecdict.db', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>

/** 语料与桌面版同路径布局：/corpus/<file>.json。 */
export const CORPUS_DIRECTORY = '/corpus'
export const DICTIONARY_FILE = '/dictionary/ecdict.db'
export const DATABASE_PATH = '/data/english-learning.db'

export function loadCorpusIntoFs(): number {
  let count = 0
  for (const [modulePath, text] of Object.entries(corpusModules)) {
    const name = modulePath.split('/').pop()
    if (name === undefined) continue
    putTextFile(`${CORPUS_DIRECTORY}/${name}`, text)
    count += 1
  }
  return count
}

export async function loadDictionaryIntoFs(): Promise<boolean> {
  const url = Object.values(dictionaryModules)[0]
  if (url === undefined) return false
  try {
    const response = await fetch(url)
    if (!response.ok) return false
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0) return false
    putBinaryFile(DICTIONARY_FILE, bytes)
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* 资料库字节的持久化                                                    */
/* ------------------------------------------------------------------ */

const IDB_NAME = 'english-learning-mobile'
const IDB_VERSION = 1
const IDB_STORE = 'files'
const DATABASE_KEY = 'database'

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(IDB_STORE)) {
        database.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('打不开本机存储'))
  })
}

export async function readStoredDatabase(): Promise<Uint8Array | null> {
  try {
    const database = await openIndexedDb()
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(IDB_STORE, 'readonly')
      const request = transaction.objectStore(IDB_STORE).get(DATABASE_KEY)
      request.onsuccess = () => {
        const value: unknown = request.result
        resolve(value instanceof Uint8Array ? value : null)
      }
      request.onerror = () => reject(request.error ?? new Error('读不出本机资料库'))
      transaction.oncomplete = () => database.close()
    })
  } catch {
    return null
  }
}

export async function writeStoredDatabase(bytes: Uint8Array): Promise<void> {
  const database = await openIndexedDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE, 'readwrite')
    transaction.objectStore(IDB_STORE).put(bytes, DATABASE_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('资料库写不进去'))
    }
  })
}

/** 把虚拟文件系统里的某个文件读出来交给分享/下载（备份、JSONL 导出用）。 */
export function readVfsFile(path: string): Uint8Array {
  return readBinary(path)
}
