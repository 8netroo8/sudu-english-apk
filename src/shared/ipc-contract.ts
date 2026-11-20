import type { ArticleWordsView } from './article-words'
import type { DictionaryLookup, DictionaryLookupRequest } from './dictionary'
import type {
  ChangeMainFormRequest,
  ChangeMainFormResult,
  CollectSelectionRequest,
  CollectSelectionResult,
  CreateLearningNoteRequest,
  DeleteEntrySentenceResult,
  EntryListRequest,
  EntryListResult,
  EntryPage,
  EntrySentenceTarget,
  LearningNoteResult,
  MergeEntriesRequest,
  MergeEntriesResult,
  MoveEntrySentenceRequest,
  MoveEntrySentenceResult,
  MoveLearningNoteRequest,
  PinLearningNoteRequest,
  ReselectEntrySentenceRequest,
  ReselectEntrySentenceResult,
  SetEntryLaterRequest,
  SetEntryLaterResult,
  UpdateLearningNoteRequest,
  WordEntryCard
} from './entries'
import type {
  ArticleDeletionPreview,
  ArticleDetail,
  DeleteArticleRequest,
  DeleteArticleResult,
  HomeSummary,
  ImportReport,
  LibraryListing,
  LibrarySearchResults,
  MarkArticleCompletedResult,
  RenameArticleRequest,
  RenameArticleResult
} from './library'
import type {
  ReadingPreferences,
  ReadingProgressRequest,
  ReadingProgressResult,
  ReadingPreferencesResult,
  ReadingSettingsRequest,
  ReadingSettingsResult,
  ReadingView
} from './reading'
import type {
  CreateBackupResult,
  OpenDataDirectoryResult,
  PickRestoreResult,
  RestoreBackupResult,
  SaveThemeRequest,
  SaveThemeResult,
  SettingsOverview
} from './settings'
import type { AppBootstrap } from './types'

/**
 * 渲染层与主进程之间唯一的调用契约。新增能力时先在这里加 channel，
 * 主进程与 preload 都会按同一份表校验，漏注册或多注册都会在启动时暴露。
 */
export interface IpcContract {
  'app:bootstrap': { payload: undefined; result: AppBootstrap }
  'home:summary': { payload: undefined; result: HomeSummary }
  'library:list': { payload: undefined; result: LibraryListing }
  'library:reimport': { payload: undefined; result: ImportReport }
  'library:detail': { payload: { articleId: string }; result: ArticleDetail | null }
  'library:search': { payload: { query: string }; result: LibrarySearchResults }
  'library:rename': { payload: RenameArticleRequest; result: RenameArticleResult }
  'library:delete-preview': {
    payload: { articleId: string }
    result: ArticleDeletionPreview | null
  }
  'library:delete': { payload: DeleteArticleRequest; result: DeleteArticleResult }
  'reading:open': { payload: { articleId: string }; result: ReadingView | null }
  'reading:words': { payload: { articleId: string }; result: ArticleWordsView | null }
  'reading:complete': {
    payload: { articleId: string }
    result: MarkArticleCompletedResult
  }
  'reading:progress': { payload: ReadingProgressRequest; result: ReadingProgressResult }
  'reading:settings': { payload: ReadingSettingsRequest; result: ReadingSettingsResult | null }
  'reading:collect': { payload: CollectSelectionRequest; result: CollectSelectionResult }
  'dictionary:lookup': { payload: DictionaryLookupRequest; result: DictionaryLookup }
  'entries:card': { payload: { entryId: string }; result: WordEntryCard | null }
  'entries:delete-sentence': {
    payload: { entrySentenceId: string }
    result: DeleteEntrySentenceResult
  }
  'entries:list': { payload: EntryListRequest; result: EntryListResult }
  'entries:page': { payload: { entryId: string }; result: EntryPage | null }
  'entries:sentence': {
    payload: { entrySentenceId: string }
    result: EntrySentenceTarget | null
  }
  'entries:merge': { payload: MergeEntriesRequest; result: MergeEntriesResult }
  'entries:main-form': { payload: ChangeMainFormRequest; result: ChangeMainFormResult }
  'entries:move-sentence': {
    payload: MoveEntrySentenceRequest
    result: MoveEntrySentenceResult
  }
  'entries:reselect-sentence': {
    payload: ReselectEntrySentenceRequest
    result: ReselectEntrySentenceResult
  }
  'entries:later': { payload: SetEntryLaterRequest; result: SetEntryLaterResult }
  'entries:create-note': {
    payload: CreateLearningNoteRequest
    result: LearningNoteResult
  }
  'entries:update-note': {
    payload: UpdateLearningNoteRequest
    result: LearningNoteResult
  }
  'entries:pin-note': { payload: PinLearningNoteRequest; result: LearningNoteResult }
  'entries:delete-note': { payload: { noteId: string }; result: LearningNoteResult }
  'entries:move-note': { payload: MoveLearningNoteRequest; result: LearningNoteResult }
  'settings:overview': { payload: undefined; result: SettingsOverview }
  'settings:reading-save': {
    payload: { preferences: ReadingPreferences }
    result: ReadingPreferencesResult
  }
  'settings:theme-save': { payload: SaveThemeRequest; result: SaveThemeResult }
  'settings:backup-create': { payload: undefined; result: CreateBackupResult }
  'settings:restore-pick': { payload: undefined; result: PickRestoreResult }
  'settings:restore': { payload: { file: string }; result: RestoreBackupResult }
  'settings:open-data-directory': {
    payload: undefined
    result: OpenDataDirectoryResult
  }
}

/**
 * 主进程主动推给渲染层的事件。事件同样走白名单，不在表里的订阅在 preload 就被拦下。
 * 目前没有需要主动推送的事件，保留这层机制，新增推送时在这里加。
 */
export interface IpcEventContract {}

export type IpcChannel = keyof IpcContract
export type IpcEventChannel = keyof IpcEventContract

// 用 Record 而不是数组列 channel：契约里加了 channel 却忘了登记，这里会编译失败。
const CHANNEL_TABLE: Record<IpcChannel, true> = {
  'app:bootstrap': true,
  'home:summary': true,
  'library:list': true,
  'library:reimport': true,
  'library:detail': true,
  'library:search': true,
  'library:rename': true,
  'library:delete-preview': true,
  'library:delete': true,
  'reading:open': true,
  'reading:words': true,
  'reading:complete': true,
  'reading:progress': true,
  'reading:settings': true,
  'reading:collect': true,
  'dictionary:lookup': true,
  'entries:card': true,
  'entries:delete-sentence': true,
  'entries:list': true,
  'entries:page': true,
  'entries:sentence': true,
  'entries:merge': true,
  'entries:main-form': true,
  'entries:move-sentence': true,
  'entries:reselect-sentence': true,
  'entries:later': true,
  'entries:create-note': true,
  'entries:update-note': true,
  'entries:pin-note': true,
  'entries:delete-note': true,
  'entries:move-note': true,
  'settings:overview': true,
  'settings:reading-save': true,
  'settings:theme-save': true,
  'settings:backup-create': true,
  'settings:restore-pick': true,
  'settings:restore': true,
  'settings:open-data-directory': true
}

const EVENT_CHANNEL_TABLE: Record<IpcEventChannel, true> = {}

export const IPC_CHANNELS: readonly IpcChannel[] = Object.keys(
  CHANNEL_TABLE
) as readonly IpcChannel[]

export function isIpcChannel(value: unknown): value is IpcChannel {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHANNEL_TABLE, value)
  )
}

export function isIpcEventChannel(value: unknown): value is IpcEventChannel {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(EVENT_CHANNEL_TABLE, value)
  )
}

/**
 * preload 挂到 `window.api` 上的接口。渲染层只认这一种访问主进程的方式。
 */
export type IpcBridge = {
  invoke<C extends IpcChannel>(
    channel: C,
    payload?: IpcContract[C]['payload']
  ): Promise<IpcContract[C]['result']>
  subscribe<E extends IpcEventChannel>(
    event: E,
    handler: (payload: IpcEventContract[E]) => void
  ): () => void
}
