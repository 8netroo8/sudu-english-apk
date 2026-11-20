import type { Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixtureArticle, writeCorpusDirectory } from '../../src/testing/corpus-fixture'
import { expect, test } from '../fixtures/app'
import { selectText } from '../fixtures/reading'

/**
 * 收官验收：错误态不只是把报错抛出来。
 * 每个错误块都要有一句人话和一个动作；断开主进程处理函数（真实的 IPC 失败），
 * 再修好、点「再试一次」，确认动作真的把页面救回来。
 */

async function nav(page: Page, label: string): Promise<void> {
  await page
    .getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: label, exact: true })
    .click()
}

const firstArticle = fixtureArticle({
  id: 'fixture-errors-2024-06-s1-c1',
  year: 2024,
  month: 6,
  set: 1,
  sentences: [
    ['A broken import should leave the rest of the library readable.', 'The warning names the failed article.'],
    ['Retrying after the file is fixed brings it back without a restart.']
  ]
})

const secondArticle = fixtureArticle({
  id: 'fixture-errors-2024-06-s1-c2',
  year: 2024,
  month: 6,
  set: 1,
  sentences: [
    ['The second article arrives when the broken file is repaired.'],
    ['Two rows then fill the same session group.']
  ]
})

let importCorpusDirectory: string
let brokenFile: string
let brokenContent: string

test.beforeAll(async () => {
  importCorpusDirectory = await mkdtemp(join(tmpdir(), 'english-learning-errors-import-'))
  writeCorpusDirectory(importCorpusDirectory, [firstArticle, secondArticle])
  brokenFile = join(importCorpusDirectory, secondArticle.file)
  brokenContent = readFileSync(brokenFile, 'utf8')
  writeFileSync(brokenFile, '{ not json\n', 'utf8')
})

test.afterAll(async () => {
  await rm(importCorpusDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  await rm(readingCorpusDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
})

const readingArticle = fixtureArticle({
  id: 'fixture-errors-2026-06-s1-b',
  year: 2026,
  month: 6,
  set: 1,
  kind: 'long_match',
  sentences: [
    [
      'Reading settings and positions must be retryable when a write fails.',
      'The page keeps the text readable while the error block explains the next step.'
    ],
    [
      'A second paragraph gives the scroll container something to move.',
      'The position write happens after the scroll stops.'
    ],
    [
      'A third paragraph makes the page tall enough for a real scroll.',
      'Retrying the write should clear the error once the database is back.'
    ],
    [
      'A fourth paragraph keeps adding height to the reading column.',
      'The retry button should be reachable without scrolling back.'
    ],
    [
      'A fifth paragraph is here so the footer is far below the first screen.',
      'Reading position changes as the sentence at the top changes.'
    ],
    [
      'A sixth paragraph continues the same typography and spacing.',
      'Nothing about the layout changes from paragraph to paragraph.'
    ],
    [
      'A seventh paragraph brings the article close to its end.',
      'The last sentence is the one the position write should report.'
    ],
    [
      'An eighth paragraph closes the fixture article.',
      'Every write failure leaves an error block with a retry action.'
    ]
  ],
  annotations: [{ surface: 'retryable', gloss: '可重试', paragraph: 0, sentence: 0 }]
})

let readingCorpusDirectory: string

test.beforeAll(async () => {
  readingCorpusDirectory = await mkdtemp(join(tmpdir(), 'english-learning-errors-reading-'))
  writeCorpusDirectory(readingCorpusDirectory, [readingArticle])
})

async function openReading(page: Page): Promise<void> {
  await nav(page, '文章库')
  await page.locator('.library-row').first().click()
  await page
    .getByRole('complementary', { name: '文章详情' })
    .getByRole('button', { name: '继续阅读' })
    .click()
  await expect(page.locator('[data-reading-page="true"]')).toBeVisible()
}

test.describe('收官验收 · 错误态', () => {
  test('导入失败时列出原因并给「重新导入」，修好后不用重启', async ({ launch }) => {
    const { page } = await launch({
      env: { CORPUS_DIRECTORY: importCorpusDirectory }
    })
    await nav(page, '文章库')

    const warning = page.getByRole('alert').filter({ hasText: '没导进来' })
    await expect(warning).toBeVisible()
    await expect(warning).toContainText('有 1 篇没导进来')
    await expect(warning).toContainText(secondArticle.id)
    await expect(warning.getByRole('button', { name: '重新导入' })).toBeVisible()
    await expect(page.locator('.library-count')).toHaveText('1 篇 · 1 个场次')

    writeFileSync(brokenFile, brokenContent, 'utf8')
    await warning.getByRole('button', { name: '重新导入' }).click()

    await expect(page.getByRole('status')).toContainText('重新导入完成：2 篇都在库里了。')
    await expect(page.getByRole('alert').filter({ hasText: '没导进来' })).toHaveCount(0)
    await expect(page.locator('.library-count')).toHaveText('2 篇 · 1 个场次')
    await expect(page.locator('.library-row')).toHaveCount(2)
  })

  test('阅读设置与阅读位置写失败时都能重试成功', async ({ launch }) => {
    const { page, electronApp } = await launch({
      env: { CORPUS_DIRECTORY: readingCorpusDirectory }
    })
    if (electronApp === null) throw new Error('开发态用例拿不到主进程句柄')
    await openReading(page)

    // 阅读位置：写库被拒 → 错误块 + 重试保存。
    await electronApp.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('reading:progress')
      ipcMain.handle('reading:progress', async () => {
        throw new Error('本机资料库暂时不可写')
      })
    })
    await page.locator('.reading-scroll').evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    const writeError = page.locator('.reading-write-error')
    await expect(writeError).toContainText('阅读位置没有记住，本机资料库可能不可写。')
    await electronApp.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('reading:progress')
      ipcMain.handle('reading:progress', async () => ({ saved: true }))
    })
    await writeError.getByRole('button', { name: '重试保存' }).click()
    await expect(page.locator('.reading-write-error')).toHaveCount(0)

    // 阅读设置：保存被拒 → 面板里给「再存一次」，重试写入的是刚才那份值。
    await page.getByRole('button', { name: '阅读设置' }).click()
    await electronApp.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('reading:settings')
      ipcMain.handle('reading:settings', async () => {
        throw new Error('本机资料库暂时不可写')
      })
    })
    await page.getByRole('group', { name: '字号' }).getByRole('button', { name: '22' }).click()
    const settingsError = page.locator('.reading-settings-error')
    await expect(settingsError).toContainText('这次阅读设置没有写入本机资料库。')
    await expect(page.locator('.reading-paragraph').first()).toHaveCSS('font-size', '20px')

    await electronApp.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('reading:settings')
      ipcMain.handle(
        'reading:settings',
        async (_event, payload: { preferences: Record<string, unknown> }) => ({
          saved: true,
          settings: { ...payload.preferences, source: 'article' }
        })
      )
    })
    await settingsError.getByRole('button', { name: '再存一次' }).click()
    await expect(page.locator('.reading-settings-error')).toHaveCount(0)
    await expect(page.locator('.reading-paragraph').first()).toHaveCSS('font-size', '22px')
  })

  test('词典没随包加载时说清楚，阅读与选词照常能用', async ({ launch, userDataDirectory }) => {
    const emptyDictionary = join(userDataDirectory, 'no-dictionary-here')
    await mkdir(emptyDictionary, { recursive: true })
    const { page } = await launch({
      env: {
        CORPUS_DIRECTORY: readingCorpusDirectory,
        DICTIONARY_DIRECTORY: emptyDictionary,
          }
    })
    await openReading(page)

    await selectText(page, 0, 'retryable')

    const panel = page.getByRole('complementary', { name: '选词结果' })
    await expect(panel).toBeVisible()
    await expect(panel.locator('.dictionary-status')).toContainText('词典没有随包加载')
    await expect(panel.locator('.reading-panel-entry')).toContainText('词条')
    await page.locator('.reading-bar-title').click()
    await expect(page.locator('.reading-collected')).toHaveCount(1)
  })
})
