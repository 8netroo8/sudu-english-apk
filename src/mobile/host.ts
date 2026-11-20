/**
 * 移动端宿主：把桌面版主进程做过的事在 WebView 里重做一遍——
 * 打开内存 SQLite、导入随包语料、装载离线词典，
 * 然后把 40 个 IPC channel 直接接到领域函数上，冒充 preload 挂给渲染层。
 *
 * 桌面版主进程的接线见 src/main/index.ts；两边差异只在「对话框 / 文件系统 / 窗口」这些平台件。
 */
import type { IpcBridge, IpcEventChannel, IpcEventContract } from '../shared/ipc-contract'
import type { AppBootstrap } from '../shared/types'
import type { ImportReport } from '../shared/library'
import { importCorpus } from '../main/corpus/import'
import { fileStamp } from '../main/file-stamp'
import { createBackup } from '../main/data/backup'
import type { AppDatabase } from '../main/db/database'
import { openDatabase } from '../main/db/database'
import { migrate, readSchemaVersion } from '../main/db/migrations'
import { readThemePreference } from '../main/db/settings'
import {
  missingDictionary,
  openDictionary,
  type Dictionary
} from '../main/dictionary/dictionary'
import {
  changeEntryMainForm,
  mergeEntries,
  moveEntrySentence,
  reselectEntrySentence
} from '../main/entries/curation'
import {
  createLearningNote,
  deleteLearningNote,
  moveLearningNote,
  pinLearningNote,
  updateLearningNote
} from '../main/entries/notes'
import { readEntryList, readEntryPage } from '../main/entries/page'
import { readArticleWords } from '../main/entries/article-words'
import { setEntryLater } from '../main/entries/later'
import {
  collectSelection,
  deleteEntrySentence,
  readEntrySentenceTarget,
  readWordEntryCard
} from '../main/entries/queries'
import { registerIpcHandlers, type IpcHandlers } from '../main/ipc/register'
import {
  deleteArticle,
  readArticleDeletionPreview,
  renameArticle
} from '../main/library/articles'
import {
  markArticleCompleted,
  readArticleDetail,
  readHomeSummary,
  readLibrary,
  searchLibrary
} from '../main/library/queries'
import {
  openReadingView,
  saveReadingPoint,
  saveReadingPreferences,
  saveReadingSettings
} from '../main/reading/queries'
import { readSettingsOverview } from '../main/settings/operations'
import { saveThemePreference } from '../main/settings/theme'
import { saveFile } from './share'
import { Database as MobileDatabase, initSqlite } from './sqlite'
import {
  CORPUS_DIRECTORY,
  DATABASE_PATH,
  DICTIONARY_FILE,
  loadCorpusIntoFs,
  loadDictionaryIntoFs,
  readStoredDatabase,
  writeStoredDatabase
} from './storage'
import { putBinaryFile, readBinary } from './vfs'

declare const __APP_VERSION__: string

const DATA_DIRECTORY = '/data'
const BACKUP_DIRECTORY = '/data/backups'

let dictionary: Dictionary | null = null

/** 语料导入失败不该拦住启动：界面里能看到哪几篇没导进来。 */
function reportCorpus(result: ImportReport): void {
  if (result.failed.length > 0) {
    console.warn(
      `[corpus] ${result.failed.length} 篇没导进来：${result.failed
        .map((failure) => `${failure.id}（${failure.reason}）`)
        .join('、')}`
    )
  }
}

function createMobileBootstrap(opened: AppDatabase, corpusImport: ImportReport): AppBootstrap {
  return {
    appVersion: __APP_VERSION__,
    isPackaged: true,
    schemaVersion: readSchemaVersion(opened),
    theme: readThemePreference(opened),
    corpusImport
  }
}

/** 改动后攒一下再落盘：一次导入会写几百条语句，逐条导出太费。 */
function persistOnChange(opened: AppDatabase): void {
  const mobile = opened as unknown as MobileDatabase
  let timer: ReturnType<typeof setTimeout> | null = null
  const flush = (): void => {
    timer = null
    if (!mobile.needsFlush) return
    mobile.flushToFile()
    void writeStoredDatabase(mobile.exportBytes()).catch(() => {
      // 写不进去时下一次改动还会再试。
    })
  }
  mobile.onChange(() => {
    if (timer !== null) return
    timer = setTimeout(flush, 400)
  })
  const flushNow = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      flush()
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow()
  })
  window.addEventListener('pagehide', flushNow)
}

/**
 * 启动顺序有讲究：sql.js 引擎 → 随包资源 → 上次的资料库字节 → 迁移 → 导入语料。
 */
export async function startMobileHost(): Promise<void> {
  await initSqlite()
  loadCorpusIntoFs()
  const dictionaryLoaded = await loadDictionaryIntoFs()

  const stored = await readStoredDatabase()
  if (stored !== null) {
    putBinaryFile(DATABASE_PATH, stored)
  }

  const opened = openDatabase(DATABASE_PATH)
  const outcome = migrate(opened)
  if (outcome.applied.length > 0) {
    console.log(`[db] schema ${outcome.from} → ${outcome.to}`)
  }
  persistOnChange(opened)

  // 每次启动都与清单对一遍：内容没变就跳过，坏了的那篇单独报出来，不静默丢。
  const corpusImport = importCorpus(opened, { directory: CORPUS_DIRECTORY })
  reportCorpus(corpusImport)

  const settingsOptions = (): {
    appVersion: string
    electronVersion: string
    dataDirectory: string
  } => ({
    appVersion: __APP_VERSION__,
    electronVersion: 'WebView',
    dataDirectory: DATA_DIRECTORY
  })

  dictionary = dictionaryLoaded ? openDictionary(DICTIONARY_FILE) : null
  if (dictionary === null) {
    console.warn('[dictionary] 内置词典没有随包加载')
  }
  const lookupDictionary = dictionary ?? missingDictionary()
  const entryDictionary = dictionary ?? undefined

  const handlers: IpcHandlers = {
    'app:bootstrap': () => createMobileBootstrap(opened, corpusImport),
    'home:summary': () => readHomeSummary(opened),
    'library:list': () => readLibrary(opened),
    'library:reimport': () => {
      const result = importCorpus(opened, { directory: CORPUS_DIRECTORY })
      reportCorpus(result)
      return result
    },
    'library:detail': (payload) => readArticleDetail(opened, payload.articleId),
    'library:search': (payload) => searchLibrary(opened, payload.query),
    'library:rename': (payload) => renameArticle(opened, payload),
    'library:delete-preview': (payload) =>
      readArticleDeletionPreview(opened, payload.articleId),
    'library:delete': (payload) => deleteArticle(opened, payload),
    'reading:open': (payload) => openReadingView(opened, payload.articleId),
    'reading:words': (payload) => readArticleWords(opened, payload.articleId),
    'reading:complete': (payload) => markArticleCompleted(opened, payload.articleId),
    'reading:progress': (payload) => saveReadingPoint(opened, payload),
    'reading:settings': (payload) => saveReadingSettings(opened, payload),
    'reading:collect': (payload) =>
      collectSelection(opened, payload, { dictionary: entryDictionary }),
    'dictionary:lookup': (payload) => lookupDictionary.lookup(payload.word),
    'entries:card': (payload) => readWordEntryCard(opened, payload.entryId),
    'entries:delete-sentence': (payload) =>
      deleteEntrySentence(opened, payload.entrySentenceId),
    'entries:list': (payload) => readEntryList(opened, payload),
    'entries:page': (payload) =>
      readEntryPage(opened, payload.entryId, { dictionary: entryDictionary }),
    'entries:sentence': (payload) =>
      readEntrySentenceTarget(opened, payload.entrySentenceId),
    'entries:merge': (payload) => mergeEntries(opened, payload),
    'entries:main-form': (payload) =>
      changeEntryMainForm(opened, payload, { dictionary: entryDictionary }),
    'entries:move-sentence': (payload) =>
      moveEntrySentence(opened, payload, { dictionary: entryDictionary }),
    'entries:reselect-sentence': (payload) =>
      reselectEntrySentence(opened, payload, { dictionary: entryDictionary }),
    'entries:later': (payload) => setEntryLater(opened, payload),
    'entries:create-note': (payload) => createLearningNote(opened, payload),
    'entries:update-note': (payload) => updateLearningNote(opened, payload),
    'entries:pin-note': (payload) => pinLearningNote(opened, payload),
    'entries:delete-note': (payload) => deleteLearningNote(opened, payload),
    'entries:move-note': (payload) => moveLearningNote(opened, payload),
    'settings:overview': () => readSettingsOverview(opened, settingsOptions()),
    'settings:reading-save': (payload) => saveReadingPreferences(opened, payload.preferences),
    'settings:theme-save': (payload) => saveThemePreference(opened, payload.theme),
    'settings:open-data-directory': async () => ({
      opened: false,
      path: `${DATA_DIRECTORY}（应用私有存储，系统里没有可见目录）`
    }),
    'settings:backup-create': async () => {
      const options = settingsOptions()
      const fileName = `english-learning-backup-${fileStamp(new Date())}.db`
      const target = `${BACKUP_DIRECTORY}/${fileName}`
      try {
        const backup = await createBackup(opened, { file: target, now: new Date().toISOString() })
        const shared = await saveFile(fileName, readBinary(backup.file), 'application/x-sqlite3')
        return shared
          ? { status: 'saved' as const, backup, overview: readSettingsOverview(opened, options) }
          : { status: 'cancelled' as const, overview: readSettingsOverview(opened, options) }
      } catch {
        return {
          status: 'failed' as const,
          reason: 'unknown' as const,
          overview: readSettingsOverview(opened, options)
        }
      }
    },
    // 恢复需要系统文件选择器，这一版先明确拒绝，而不是假装成功。
    'settings:restore-pick': () => ({ status: 'cancelled' as const }),
    'settings:restore': () => ({
      status: 'rejected' as const,
      reason: 'missing' as const,
      overview: readSettingsOverview(opened, settingsOptions())
    })
  }

  // registerIpcHandlers 存进来的是 Electron 那样的包装函数：(event, payload) => result。
  const handlerTable = new Map<string, (event: unknown, payload: unknown) => unknown>()
  registerIpcHandlers(
    {
      handle(channel, listener) {
        handlerTable.set(channel, listener as (event: unknown, payload: unknown) => unknown)
      }
    },
    handlers
  )

  const listeners = new Map<string, Set<(payload: unknown) => void>>()

  function emit(channel: string, payload: unknown): void {
    for (const listener of listeners.get(channel) ?? []) {
      listener(payload)
    }
  }

  const invoke = async (channel: string, payload: unknown): Promise<unknown> => {
    const listener = handlerTable.get(channel)
    if (listener === undefined) {
      throw new Error(`没有这个 channel：${channel}`)
    }
    return listener({ sender: { send: emit } }, payload)
  }

  const bridge = {
    invoke: invoke as IpcBridge['invoke'],
    subscribe(event: IpcEventChannel, handler: (payload: never) => void): () => void {
      const set = listeners.get(event) ?? new Set()
      const wrapped = handler as (payload: unknown) => void
      set.add(wrapped)
      listeners.set(event, set)
      return () => {
        set.delete(wrapped)
      }
    }
  } satisfies IpcBridge

  window.api = bridge

  // 首次启动把刚迁移好的库写出一次，免得用户什么都没做就刷新丢了。
  const mobile = opened as unknown as MobileDatabase
  mobile.flushToFile()
  await writeStoredDatabase(mobile.exportBytes())
}

/** 事件名在桌面版由 preload 白名单校验；这里保持同样的约定，避免拼错没人发现。 */
export const MOBILE_EVENT_CHANNELS: readonly IpcEventChannel[] = []

export type MobileEventPayloads = IpcEventContract
