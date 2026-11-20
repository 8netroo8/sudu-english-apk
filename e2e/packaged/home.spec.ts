import { expect, test } from '../fixtures/app'
import { LATEST_SCHEMA_VERSION } from '../../src/main/db/migrations'
import { readBootstrap } from '../fixtures/bridge'
import { databasePath, readSchemaVersion } from '../fixtures/database'

const NAV_LABELS = ['首页', '阅读', '词条', '文章库', '设置']

test('打包产物能启动并显示首页', async ({ launch }) => {
  const { page, userDataDirectory, close } = await launch({ packaged: true })

  const navigation = page.getByRole('navigation', { name: '全局导航' })
  await expect(navigation).toBeVisible()
  await expect(navigation.getByRole('button')).toHaveText(NAV_LABELS)
  await expect(page.getByRole('heading', { name: '先读一篇' })).toBeVisible()

  const bootstrap = await readBootstrap(page)
  expect(bootstrap.isPackaged).toBe(true)
  expect(bootstrap.schemaVersion).toBe(LATEST_SCHEMA_VERSION)
  expect(bootstrap.corpusImport).toMatchObject({ total: 63, imported: 63, failed: [] })

  // 语料随包分发：打包产物里也能看到全部 63 篇。
  await navigation.getByRole('button', { name: '文章库' }).click()
  await expect(page.getByText('63 篇 · 7 个场次')).toBeVisible()
  await expect(page.locator('.library-session')).toHaveCount(7)

  // 词典也随包分发：打包后从 resources 里读得到，不走 asar。
  const lookup = await page.evaluate(async () => {
    const api = (
      window as unknown as {
        api: { invoke(channel: string, payload: unknown): Promise<unknown> }
      }
    ).api
    return api.invoke('dictionary:lookup', { word: 'approach' })
  })
  expect(lookup).toMatchObject({ status: 'found', via: 'exact' })

  const contentSecurityPolicy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')
  expect(contentSecurityPolicy ?? '').toContain("script-src 'self';")

  await close()
  expect(readSchemaVersion(databasePath(userDataDirectory))).toBe(LATEST_SCHEMA_VERSION)
})
