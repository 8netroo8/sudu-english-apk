import type { DictionaryLookup } from '../../shared/dictionary'
import type { ArticleWordsView } from '../../shared/article-words'
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
} from '../../shared/library'
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
} from '../../shared/entries'
import type {
  ReadingPreferences,
  ReadingProgressRequest,
  ReadingProgressResult,
  ReadingPreferencesResult,
  ReadingSettingsRequest,
  ReadingSettingsResult,
  ReadingView
} from '../../shared/reading'
import type {
  CreateBackupResult,
  OpenDataDirectoryResult,
  PickRestoreResult,
  RestoreBackupResult,
  SaveThemeResult,
  SettingsOverview
} from '../../shared/settings'
import type { AppBootstrap, ThemePreference } from '../../shared/types'

export function loadBootstrap(): Promise<AppBootstrap> {
  return window.api.invoke('app:bootstrap')
}

export function loadHomeSummary(): Promise<HomeSummary> {
  return window.api.invoke('home:summary')
}

export function loadLibrary(): Promise<LibraryListing> {
  return window.api.invoke('library:list')
}

/** 再对一遍随包语料：失败的那几篇修好后不必重启应用。 */
export function reimportCorpus(): Promise<ImportReport> {
  return window.api.invoke('library:reimport')
}

export function loadArticleDetail(articleId: string): Promise<ArticleDetail | null> {
  return window.api.invoke('library:detail', { articleId })
}

export function searchLibrary(query: string): Promise<LibrarySearchResults> {
  return window.api.invoke('library:search', { query })
}

/** 只改文章显示名；语料刷新后仍沿用这个名字。 */
export function renameArticle(request: RenameArticleRequest): Promise<RenameArticleResult> {
  return window.api.invoke('library:rename', request)
}

/** 删除前的影响面：原句关联、受影响/消失词条、学习内容与挂在本篇的钉住。 */
export function loadArticleDeletionPreview(
  articleId: string
): Promise<ArticleDeletionPreview | null> {
  return window.api.invoke('library:delete-preview', { articleId })
}

/** 删除文章；请求带上确认弹层看到的那份影响面，变了主进程会拒绝并带回最新一份。 */
export function deleteArticle(request: DeleteArticleRequest): Promise<DeleteArticleResult> {
  return window.api.invoke('library:delete', request)
}

/** 打开一篇文章：换回正文、生效设置与上次读到的位置，同时记下「最近打开」。 */
export function openReadingView(articleId: string): Promise<ReadingView | null> {
  return window.api.invoke('reading:open', { articleId })
}

/**
 * 一篇文章的「本篇选词」：按段落列出实际收下的词条与原句。
 * 纯查询，不写完成时间、不记最近打开、不改阅读位置与本篇阅读设置。
 */
export function loadArticleWords(articleId: string): Promise<ArticleWordsView | null> {
  return window.api.invoke('reading:words', { articleId })
}

/**
 * 显式标记这一篇已读完：只写完成时间、只写一次。进入本篇选词的页面先发这条命令，
 * 再读视图；命令失败就报错重试，不拿乐观的 100% 冒充已读完。
 */
export function completeArticleReading(
  articleId: string
): Promise<MarkArticleCompletedResult> {
  return window.api.invoke('reading:complete', { articleId })
}

/** 记下读到哪一段、哪一句。 */
export function saveReadingPoint(request: ReadingProgressRequest): Promise<ReadingProgressResult> {
  return window.api.invoke('reading:progress', request)
}

/** 记住这一篇的字号、行距与注释开关。 */
export function saveReadingSettings(
  request: ReadingSettingsRequest
): Promise<ReadingSettingsResult | null> {
  return window.api.invoke('reading:settings', request)
}

/** 收下一次选词：当场建原句、归词条，并拿回这一篇最新的标记。 */
export function collectSelection(
  request: CollectSelectionRequest
): Promise<CollectSelectionResult> {
  return window.api.invoke('reading:collect', request)
}

/** 查内置离线词典：不联网、不调用模型。 */
export function lookupDictionary(word: string): Promise<DictionaryLookup> {
  return window.api.invoke('dictionary:lookup', { word })
}

/** 点开一个已收集的词，读它的词条卡与原句。 */
export function loadWordEntryCard(entryId: string): Promise<WordEntryCard | null> {
  return window.api.invoke('entries:card', { entryId })
}

/** 删掉一条原句；词条只剩这一条时连词条一起删。 */
export function deleteEntrySentence(entrySentenceId: string): Promise<DeleteEntrySentenceResult> {
  return window.api.invoke('entries:delete-sentence', { entrySentenceId })
}

/** 词条页左栏：计数、搜索、排序与筛选。 */
export function loadEntryList(request: EntryListRequest): Promise<EntryListResult> {
  return window.api.invoke('entries:list', request)
}

/** 词条页的一整页：主词形、按文章分组的原句与学习内容。 */
export function loadEntryPage(entryId: string): Promise<EntryPage | null> {
  return window.api.invoke('entries:page', { entryId })
}

/** 阅读页从词条跳过来时要定位的原句。 */
export function loadEntrySentenceTarget(
  entrySentenceId: string
): Promise<EntrySentenceTarget | null> {
  return window.api.invoke('entries:sentence', { entrySentenceId })
}

/** 合并两个词条，源词条的原句与学习内容迁到目标。 */
export function mergeEntries(request: MergeEntriesRequest): Promise<MergeEntriesResult> {
  return window.api.invoke('entries:merge', request)
}

/** 换主词形，只能从已收集的词形里选。 */
export function changeEntryMainForm(
  request: ChangeMainFormRequest
): Promise<ChangeMainFormResult> {
  return window.api.invoke('entries:main-form', request)
}

/** 把一条原句拆到别的词条或新词条。 */
export function moveEntrySentence(
  request: MoveEntrySentenceRequest
): Promise<MoveEntrySentenceResult> {
  return window.api.invoke('entries:move-sentence', request)
}

/** 重新圈定原句范围。 */
export function reselectEntrySentence(
  request: ReselectEntrySentenceRequest
): Promise<ReselectEntrySentenceResult> {
  return window.api.invoke('entries:reselect-sentence', request)
}

/** 标记或取消「稍后看」；只改独立标记，不新建词条、不动收集。 */
export function setEntryLater(
  request: SetEntryLaterRequest
): Promise<SetEntryLaterResult> {
  return window.api.invoke('entries:later', request)
}

export function createLearningNote(
  request: CreateLearningNoteRequest
): Promise<LearningNoteResult> {
  return window.api.invoke('entries:create-note', request)
}

export function updateLearningNote(
  request: UpdateLearningNoteRequest
): Promise<LearningNoteResult> {
  return window.api.invoke('entries:update-note', request)
}

export function pinLearningNote(request: PinLearningNoteRequest): Promise<LearningNoteResult> {
  return window.api.invoke('entries:pin-note', request)
}

export function deleteLearningNote(noteId: string): Promise<LearningNoteResult> {
  return window.api.invoke('entries:delete-note', { noteId })
}

export function moveLearningNote(request: MoveLearningNoteRequest): Promise<LearningNoteResult> {
  return window.api.invoke('entries:move-note', request)
}

/* ---------- 设置 ---------- */

/** 设置页一次读全：阅读默认、主题、版本与数据目录。 */
export function loadSettingsOverview(): Promise<SettingsOverview> {
  return window.api.invoke('settings:overview')
}

/** 改全局阅读默认；单篇覆盖不受影响。 */
export function saveReadingPreferences(
  preferences: ReadingPreferences
): Promise<ReadingPreferencesResult> {
  return window.api.invoke('settings:reading-save', { preferences })
}

/** 浅色 / 深色 / 跟随系统。 */
export function saveTheme(theme: ThemePreference): Promise<SaveThemeResult> {
  return window.api.invoke('settings:theme-save', { theme })
}

export function openDataDirectory(): Promise<OpenDataDirectoryResult> {
  return window.api.invoke('settings:open-data-directory')
}

/** 一键备份：主进程弹保存对话框，把整库副本写到选定位置。 */
export function createBackup(): Promise<CreateBackupResult> {
  return window.api.invoke('settings:backup-create')
}

/** 从备份恢复第一步：选文件，并看清版本与时间。 */
export function pickRestoreFile(): Promise<PickRestoreResult> {
  return window.api.invoke('settings:restore-pick')
}

/** 从备份恢复第二步：确认后整体替换，替换前自动留快照。 */
export function restoreBackup(file: string): Promise<RestoreBackupResult> {
  return window.api.invoke('settings:restore', { file })
}
