import { describe, expect, it } from 'vitest'
import type { AppBootstrap } from '../shared/types'
import { createBridge, type IpcRendererLike } from './bridge'

const bootstrap: AppBootstrap = {
  appVersion: '0.1.0',
  isPackaged: false,
  schemaVersion: 3,
  theme: 'light',
  corpusImport: { total: 0, imported: 0, updated: 0, skipped: 0, failed: [] }
}

function fakeRenderer(): {
  ipc: IpcRendererLike
  listeners: Map<string, (event: unknown, payload: unknown) => void>
  invocations: Array<{ channel: string; payload: unknown }>
} {
  const listeners = new Map<string, (event: unknown, payload: unknown) => void>()
  const invocations: Array<{ channel: string; payload: unknown }> = []
  return {
    listeners,
    invocations,
    ipc: {
      async invoke(channel, payload) {
        invocations.push({ channel, payload })
        return bootstrap
      },
      on(channel, listener) {
        listeners.set(channel, listener)
      },
      removeListener(channel, listener) {
        if (listeners.get(channel) === listener) {
          listeners.delete(channel)
        }
      }
    }
  }
}

describe('createBridge', () => {
  it('把已知 channel 的请求转给主进程并返回结果', async () => {
    const { ipc, invocations } = fakeRenderer()

    const bridge = createBridge(ipc)

    await expect(bridge.invoke('app:bootstrap')).resolves.toEqual(bootstrap)
    expect(invocations).toEqual([{ channel: 'app:bootstrap', payload: undefined }])
  })

  it('稍后看标记走同一份白名单', async () => {
    const { ipc } = fakeRenderer()
    const calls: unknown[] = []
    const bridge = createBridge({
      ...ipc,
      async invoke(channel, payload) {
        calls.push({ channel, payload })
        return { status: 'marked', markedAt: '2026-11-18T08:10:00.000Z' }
      }
    })

    await expect(
      bridge.invoke('entries:later', { entryId: 'entry-1', later: true })
    ).resolves.toEqual({ status: 'marked', markedAt: '2026-11-18T08:10:00.000Z' })
    expect(calls).toEqual([
      { channel: 'entries:later', payload: { entryId: 'entry-1', later: true } }
    ])
  })

  it('文章重命名与删除的请求和结果穿过 preload 白名单', async () => {
    const { ipc, invocations } = fakeRenderer()
    const bridge = createBridge(ipc)
    const confirmed = {
      articleId: 'article-1',
      sentenceAssociationCount: 0,
      affectedEntryCount: 0,
      disappearingEntryCount: 0,
      survivingEntryCount: 0,
      disappearingLearningNoteCount: 0
    }

    await bridge.invoke('library:rename', { articleId: 'article-1', title: '我的文章' })
    await bridge.invoke('library:delete-preview', { articleId: 'article-1' })
    await bridge.invoke('library:delete', { articleId: 'article-1', confirmed })
    await bridge.invoke('reading:complete', { articleId: 'article-1' })

    expect(JSON.parse(JSON.stringify(invocations))).toEqual([
      { channel: 'library:rename', payload: { articleId: 'article-1', title: '我的文章' } },
      { channel: 'library:delete-preview', payload: { articleId: 'article-1' } },
      { channel: 'library:delete', payload: { articleId: 'article-1', confirmed } },
      { channel: 'reading:complete', payload: { articleId: 'article-1' } }
    ])
  })

  it('未知 channel 立即报错，且不发给主进程', async () => {
    const { ipc, invocations } = fakeRenderer()
    const bridge = createBridge(ipc)

    await expect(bridge.invoke('app:unknown' as never)).rejects.toThrow('Unknown IPC channel')
    await expect(bridge.invoke(42 as never)).rejects.toThrow('Unknown IPC channel')
    expect(invocations).toHaveLength(0)
  })

  it('现在没有事件 channel：订阅任何频道都立即报错', () => {
    const { ipc, listeners } = fakeRenderer()
    const bridge = createBridge(ipc)

    expect(() => bridge.subscribe('app:bootstrap' as never, () => undefined)).toThrow(
      'Unknown IPC event channel'
    )
    expect(listeners.size).toBe(0)
  })
})
