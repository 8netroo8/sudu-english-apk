import type { Page } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixtureArticle, writeCorpusDirectory } from '../../src/testing/corpus-fixture'
import { expect, test } from '../fixtures/app'

function settingsNav(page: Page) {
  return page.getByRole('complementary', { name: '设置分区' })
}

async function openSettings(page: Page): Promise<void> {
  await page
    .getByRole('navigation', { name: '全局导航' })
    .getByRole('button', { name: '设置' })
    .click()
  await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
}

const firstArticle = fixtureArticle({
  id: 'fixture-settings-2024-06-s1-c1',
  year: 2024,
  month: 6,
  set: 1,
  sentences: [
    ['Settings keep the global default in one place.', 'Each passage can still keep its own.'],
    ['Reading never loses the sentence it came from.']
  ]
})

const secondArticle = fixtureArticle({
  id: 'fixture-settings-2024-06-s1-c2',
  year: 2024,
  month: 6,
  set: 1,
  sentences: [
    ['A second passage follows the global default.', 'No override has been written for it yet.'],
    ['The reading column stays at six hundred and twenty pixels.']
  ]
})

let corpusDirectory: string

test.beforeAll(async () => {
  corpusDirectory = await mkdtemp(join(tmpdir(), 'english-learning-settings-corpus-'))
  writeCorpusDirectory(corpusDirectory, [firstArticle, secondArticle])
})

test.afterAll(async () => {
  await rm(corpusDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

test.describe('设置与密钥', () => {

  test('关于页列出程序版本、Electron 版本与词典版权', async ({ launch }) => {
    const { page } = await launch()
    await openSettings(page)
    await settingsNav(page).getByRole('button', { name: '关于' }).click()

    const about = page.getByRole('region', { name: '关于' })
    await expect(about).toContainText(/版本 0\.1\.0 · Electron 4\d/)
    await expect(about).toContainText('ECDICT（MIT License）')
    await expect(about).toContainText('ADR 0001')
    await expect(about).toContainText('ADR 0003')
  })

  test('主题浅色 / 深色 / 跟随系统立即生效，刷新后仍是选过的那档', async ({ launch }) => {
    const { page } = await launch()
    await openSettings(page)
    await settingsNav(page).getByRole('button', { name: '外观' }).click()

    const theme = page.getByRole('group', { name: '主题' })
    await expect(theme.getByRole('button', { name: '浅色' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await theme.getByRole('button', { name: '深色' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByRole('status')).toContainText('已切换到深色')

    // 刷新后 bootstrap 从本机库读回深色。
    await page.reload()
    await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await settingsNav(page).getByRole('button', { name: '外观' }).click()
    await theme.getByRole('button', { name: '跟随系统' }).click()
    await expect(theme.getByRole('button', { name: '跟随系统' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    const systemTheme = await page.evaluate(() =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    )
    await expect(page.locator('html')).toHaveAttribute('data-theme', systemTheme)

    await theme.getByRole('button', { name: '浅色' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('设置页改的是全局默认，单篇覆盖不被覆盖', async ({ launch }) => {
    const { page } = await launch({
      env: { CORPUS_DIRECTORY: corpusDirectory }
    })

    async function openArticle(index: number): Promise<void> {
      await page
        .getByRole('navigation', { name: '全局导航' })
        .getByRole('button', { name: '文章库' })
        .click()
      await expect(page.getByRole('heading', { name: '文章库', level: 1 })).toBeVisible()
      await page.locator('.library-row').nth(index).click()
      await page
        .getByRole('complementary', { name: '文章详情' })
        .getByRole('button', { name: '继续阅读' })
        .click()
      await expect(page.locator('[data-reading-page="true"]')).toBeVisible()
      await expect(page.locator('.reading-paragraph').first()).toBeVisible()
    }

    async function leaveReading(): Promise<void> {
      // 阅读设置面板开着时，第一次 Esc 只关面板；没开时按一次就退回文章库。
      const panel = page.getByRole('region', { name: '阅读设置' })
      if (await panel.isVisible()) {
        await page.keyboard.press('Escape')
        await expect(panel).toBeHidden()
      }
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading', { name: '文章库', level: 1 })).toBeVisible()
    }

    // 第一篇：在阅读页面板里改成本篇覆盖值 22。
    await openArticle(0)
    await page.getByRole('button', { name: '阅读设置' }).click()
    await page.getByRole('group', { name: '字号' }).getByRole('button', { name: '22' }).click()
    await expect(page.locator('.reading-paragraph').first()).toHaveCSS('font-size', '22px')
    await leaveReading()

    // 设置页把全局默认改成 16。
    await openSettings(page)
    await settingsNav(page).getByRole('button', { name: '阅读' }).click()
    await page.getByRole('group', { name: '默认字号' }).getByRole('button', { name: '16' }).click()
    await expect(page.getByRole('status')).toContainText('已保存为全局默认')
    await expect(page.locator('.settings-summary')).toHaveText(
      '当前全局默认 · 字号 16 · 行距 1.8 · 注释显示 · 弱高亮开'
    )

    // 有本篇覆盖的第一篇仍是 22。
    await openArticle(0)
    await expect(page.locator('.reading-paragraph').first()).toHaveCSS('font-size', '22px')
    await leaveReading()

    // 没单独调过的第二篇跟着全局默认走 16。
    await openArticle(1)
    await expect(page.locator('.reading-paragraph').first()).toHaveCSS('font-size', '16px')
  })
})
