import type { ElectronApplication, Page } from '@playwright/test'
import Database from 'better-sqlite3'
import { existsSync, readdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '../fixtures/app'

let workspace: string

test.beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'english-learning-data-e2e-'))
})

test.afterAll(async () => {
  await rm(workspace, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
})

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

async function openData(page: Page): Promise<void> {
  await openSettings(page)
  await settingsNav(page).getByRole('button', { name: '数据' }).click()
  await expect(page.getByRole('heading', { name: '数据' })).toBeVisible()
}

/** 系统对话框在 E2E 里没法点：把它换成直接返回用例给的路径。 */
async function stubSaveDialog(app: ElectronApplication, file: string): Promise<void> {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = (async () => ({
      canceled: false,
      filePath
    })) as unknown as typeof dialog.showSaveDialog
  }, file)
}

async function stubOpenDialog(app: ElectronApplication, file: string): Promise<void> {
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = (async () => ({
      canceled: false,
      filePaths: [filePath]
    })) as unknown as typeof dialog.showOpenDialog
  }, file)
}

test.describe('备份与恢复', () => {
  test('一键备份落盘；恢复整体替换，替换前自动留快照', async ({ launch }) => {
    const backupFile = join(workspace, 'chosen', 'english-learning-backup.db')
    const handle = await launch()
    const { page, electronApp } = handle
    if (electronApp === null) throw new Error('开发态用例拿不到主进程句柄')

    await openData(page)
    await expect(page.locator('.data-line').first()).toContainText('上次备份：还没有备份')

    await stubSaveDialog(electronApp, backupFile)
    await page.getByRole('button', { name: '立即备份' }).click()

    await expect(page.getByRole('status')).toContainText('已备份到 english-learning-backup.db')
    await expect(page.locator('.data-line').first()).toContainText(
      /上次备份：\d{4}-\d{2}-\d{2} \d{2}:\d{2} · \d+(?:\.\d)? (?:B|KB|MB)/
    )
    expect(existsSync(backupFile)).toBe(true)

    // 备份出来的是可直接打开的资料库，语料也一起在里面。
    const copy = new Database(backupFile, { readonly: true, fileMustExist: true })
    try {
      const row = copy.prepare('SELECT COUNT(*) AS total FROM article').get() as { total: number }
      expect(row.total).toBeGreaterThan(0)
    } finally {
      copy.close()
    }

    // 备份之后改成深色主题；恢复应当退回备份时的浅色。
    await settingsNav(page).getByRole('button', { name: '外观' }).click()
    await page.getByRole('group', { name: '主题' }).getByRole('button', { name: '深色' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await openData(page)
    await stubOpenDialog(electronApp, backupFile)
    await page.getByRole('button', { name: '从备份恢复…' }).click()

    const confirm = page.getByRole('alertdialog', { name: '确认恢复' })
    await expect(confirm).toContainText('english-learning-backup.db')
    await expect(confirm).toContainText('替换前会自动留一份当前快照')

    // 恢复成功后整库换过，界面重新载入；路由留在设置页。
    const reloaded = page.waitForEvent('load')
    await confirm.getByRole('button', { name: '恢复' }).click()
    await reloaded
    await expect(page.getByRole('heading', { name: '设置', level: 1 })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    const snapshots = readdirSync(join(handle.userDataDirectory, 'snapshots'))
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]?.endsWith('.db')).toBe(true)

    // 数据区也记得这次恢复留下的快照，以及刚用过的这份备份。
    await openData(page)
    await expect(page.locator('.data-line').first()).toContainText(
      /上次备份：\d{4}-\d{2}-\d{2} \d{2}:\d{2} · \d+(?:\.\d)? (?:B|KB|MB)/
    )
    await expect(page.locator('.data-line').nth(1)).toContainText('恢复前快照：')
    await expect(page.locator('.data-line').nth(1)).toContainText(/\d+(?:\.\d)? (?:B|KB|MB)/)
  })
})
