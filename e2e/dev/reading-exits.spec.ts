import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixtureArticle, writeCorpusDirectory } from '../../src/testing/corpus-fixture'
import { expect, test } from '../fixtures/app'
import { seedWordEntries } from '../fixtures/entries'
import { clickAway, selectText } from '../fixtures/reading'

const article = fixtureArticle({
  id: 'fixture-reading-exits',
  sentences: [
    ['Employers approach hiring differently.'],
    ['Approaching a new desk takes patience.']
  ],
  annotations: [{ surface: 'approach', gloss: '接近', paragraph: 0, sentence: 0 }]
})

let corpusDirectory: string

test.beforeAll(async () => {
  corpusDirectory = await mkdtemp(join(tmpdir(), 'english-learning-reading-exits-'))
  writeCorpusDirectory(corpusDirectory, [article])
})

test.afterAll(async () => {
  await rm(corpusDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

test('阅读页返回按钮标明来源，缺省时仍可返回', async ({ launch, userDataDirectory }) => {
  seedWordEntries(userDataDirectory, corpusDirectory, {
    picks: [{ entry: article, paragraphIndex: 0, needle: 'approach' }]
  })
  const { page } = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  const nav = page.getByRole('navigation', { name: '全局导航' })
  await nav.getByRole('button', { name: '文章库' }).click()
  await page.locator('.library-row').first().click()
  await page.getByRole('complementary', { name: '文章详情' })
    .getByRole('button', { name: '继续阅读' }).click()
  await expect(page.getByRole('button', { name: '返回文章库' })).toContainText('文章库')
  await page.getByRole('button', { name: '返回文章库' }).click()

  await nav.getByRole('button', { name: '首页' }).click()
  await page.getByRole('button', { name: '继续阅读' }).click()
  await expect(page.getByRole('button', { name: '返回首页' })).toContainText('首页')
  await page.getByRole('button', { name: '返回首页' }).click()

  await nav.getByRole('button', { name: '词条' }).click()
  await page.locator('.entries-row').filter({ hasText: 'approach' }).click()
  await page.getByRole('button', { name: '回到原文' }).first().click()
  await expect(page.getByRole('button', { name: '返回词条' })).toContainText('词条')
  await page.getByRole('button', { name: '返回词条' }).click()

  // 全局搜索尚未实现，先验证它可以通过来源参数标明返回目标。
  await page.evaluate((id) => { window.location.hash = `#/reading/${id}?from=search` }, article.id)
  await expect(page.getByRole('button', { name: '返回搜索结果' })).toContainText('搜索结果')
  await page.evaluate((id) => { window.location.hash = `#/reading/${id}` }, article.id)
  await expect(page.getByRole('button', { name: '返回', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.getByRole('button', { name: '返回搜索结果' })).toBeVisible()
})

test('重启后从阅读回到原词条并定位所选原句', async ({ launch, userDataDirectory }) => {
  seedWordEntries(userDataDirectory, corpusDirectory, {
    picks: [{ entry: article, paragraphIndex: 0, needle: 'approach' }]
  })
  const first = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  await first.page.getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '词条' }).click()
  await first.page.locator('.entries-row').filter({ hasText: 'approach' }).click()
  const sentence = first.page.locator('.entry-sentence')
    .filter({ hasText: 'Employers approach hiring differently.' })
  await sentence.getByRole('button', { name: '回到原文' }).click()
  await expect(first.page.getByRole('button', { name: '返回词条' })).toBeVisible()
  await first.close()

  const second = await launch({ userDataDirectory, env: { CORPUS_DIRECTORY: corpusDirectory } })
  await second.page.getByRole('button', { name: '返回词条' }).click()
  await expect(second.page.getByRole('heading', { name: 'approach', level: 2 })).toBeVisible()
  const restored = second.page.locator('.entry-sentence')
    .filter({ hasText: 'Employers approach hiring differently.' })
  await expect(restored).toHaveAttribute('data-focused', 'true')
  await expect(restored).toBeInViewport()
})

test('没有读过文章时从首页进入空阅读页，仍标明首页来源', async ({ launch }) => {
  const { page } = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  await page.getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '阅读' }).click()
  await expect(page.getByRole('button', { name: '返回首页' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/reading?from=home')
  await page.getByRole('button', { name: '返回首页' }).click()
  await expect(page.getByRole('heading', { name: '先读一篇' })).toBeVisible()
})

test('重启后没有来源的阅读页仍可返回首页', async ({ launch, userDataDirectory }) => {
  const first = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  await first.page.evaluate((id) => { window.location.hash = `#/reading/${id}` }, article.id)
  await expect(first.page.getByRole('button', { name: '返回', exact: true })).toBeVisible()
  await first.close()
  const second = await launch({ userDataDirectory, env: { CORPUS_DIRECTORY: corpusDirectory } })
  await second.page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(second.page.getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '首页' })).toHaveAttribute('aria-current', 'page')
  await expect(second.page.getByRole('region', { name: '继续阅读' })).toBeVisible()
})

test('刚收下与已收集的词都能直接打开选中的词条', async ({ launch }) => {
  const { page } = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  await page.getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '文章库' }).click()
  await page.locator('.library-row').first().click()
  await page.getByRole('complementary', { name: '文章详情' })
    .getByRole('button', { name: '继续阅读' }).click()

  await selectText(page, 0, 'approach')
  await page.getByRole('complementary', { name: '选词结果' })
    .getByRole('button', { name: '查看词条' }).click()
  await expect(page.getByRole('heading', { name: '词条', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'approach', level: 2 })).toBeVisible()

  await page.goBack()
  await expect(page.locator('.reading-collected')).toHaveCount(1)
  await clickAway(page)
  await page.locator('.reading-collected').first().click()
  await page.getByRole('complementary', { name: '词条' })
    .getByRole('button', { name: '打开词条' }).click()
  await expect(page.getByRole('heading', { name: '词条', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'approach', level: 2 })).toBeVisible()
})

test('注释开关显示当前状态，并与正文的注释一致', async ({ launch }) => {
  const { page } = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  await page.getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '文章库' }).click()
  await page.locator('.library-row').first().click()
  await page.getByRole('complementary', { name: '文章详情' })
    .getByRole('button', { name: '继续阅读' }).click()
  const hide = page.getByRole('button', { name: '隐藏原文注释' })
  await expect(hide).toHaveText('注释：开')
  await expect(hide).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.reading-notes')).toBeVisible()
  await hide.click()
  const show = page.getByRole('button', { name: '显示原文注释' })
  await expect(show).toHaveText('注释：关')
  await expect(show).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.reading-notes')).toBeHidden()
  await show.click()
  await expect(hide).toHaveText('注释：开')
  await expect(page.locator('.reading-notes')).toBeVisible()
})

test('阅读顶栏在窄窗口仍可见且不横向溢出', async ({ launch }) => {
  const { page, electronApp } = await launch({ env: { CORPUS_DIRECTORY: corpusDirectory } })
  if (electronApp === null) throw new Error('需要开发版 Electron 进程')
  await page.getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '文章库' }).click()
  await page.locator('.library-row').first().click()
  await page.getByRole('complementary', { name: '文章详情' })
    .getByRole('button', { name: '继续阅读' }).click()
  for (const requested of [900, 1000, 1100]) {
    await electronApp.evaluate(({ BrowserWindow }, width) => {
      const window = BrowserWindow.getAllWindows()[0]
      if (!window) throw new Error('没有主窗口')
      window.setContentSize(width, 820)
    }, requested)
    await expect.poll(() => page.evaluate(() => window.innerWidth)).toBeGreaterThanOrEqual(requested)
    const measurements = await page.evaluate(() => {
      const reading = document.querySelector<HTMLElement>('.reading')!
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('.reading-bar button'))
      return {
        width: window.innerWidth,
        scrollWidth: reading.scrollWidth,
        clientWidth: reading.clientWidth,
        buttons: buttons.map((button) => {
          const box = button.getBoundingClientRect()
          return { left: box.left, right: box.right, width: box.width }
        })
      }
    })
    expect(measurements.scrollWidth).toBeLessThanOrEqual(measurements.clientWidth + 1)
    for (const button of measurements.buttons) {
      expect(button.width).toBeGreaterThan(0)
      expect(button.left).toBeGreaterThanOrEqual(0)
      expect(button.right).toBeLessThanOrEqual(measurements.width + 1)
    }
  }
})
