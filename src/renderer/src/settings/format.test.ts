import { describe, expect, it } from 'vitest'
import type { BackupSummary } from '../../../shared/settings'
import {
  backupSummaryText,
  fileNameOf,
  formatBytes,
  formatMoment,
  readingDefaultsText,
  restoreRejectionText,
  themeText
} from './format'

describe('formatMoment', () => {
  it('按本机时区写成 年-月-日 时:分', () => {
    const date = new Date(2026, 0, 2, 3, 4)
    expect(formatMoment(date.toISOString())).toBe('2026-01-02 03:04')
  })

  it('坏值不显示成假时间', () => {
    expect(formatMoment('nope')).toBe('')
  })
})

describe('themeText', () => {
  it('三档各有中文名', () => {
    expect(themeText('light')).toBe('浅色')
    expect(themeText('dark')).toBe('深色')
    expect(themeText('system')).toBe('跟随系统')
  })
})

describe('readingDefaultsText', () => {
  it('把全局默认写在一行里', () => {
    expect(
      readingDefaultsText({
        fontSize: 20,
        lineHeight: 1.8,
        annotationsVisible: true,
        weakHighlight: true
      })
    ).toBe('字号 20 · 行距 1.8 · 注释显示 · 弱高亮开')

    expect(
      readingDefaultsText({
        fontSize: 22,
        lineHeight: 2,
        annotationsVisible: false,
        weakHighlight: false
      })
    ).toBe('字号 22 · 行距 2.0 · 注释隐藏 · 弱高亮关')
  })
})

describe('formatBytes', () => {
  it('按 1024 进位，KB 与 MB 留一位小数', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB')
  })
})

describe('backupSummaryText', () => {
  const backupAt = new Date(2026, 10, 18, 19, 4).toISOString()

  function summary(patch: Partial<BackupSummary> = {}): BackupSummary {
    return {
      at: backupAt,
      file: 'C:/backups/backup.db',
      bytes: 2048,
      kind: 'manual',
      exists: true,
      ...patch
    }
  }

  it('写清时间与体积', () => {
    expect(backupSummaryText(summary())).toBe(
      `${formatMoment(backupAt)} · 2.0 KB`
    )
  })

  it('文件不在原处时直说，不报一个假的体积', () => {
    expect(backupSummaryText(summary({ exists: false }))).toBe(
      `${formatMoment(backupAt)} · 文件已不在原处`
    )
  })
})

describe('restoreRejectionText', () => {
  it('每种拒绝都有能看懂的说法', () => {
    expect(restoreRejectionText('missing')).toBe('这个备份文件已经不在了。')
    expect(restoreRejectionText('not-a-database')).toBe('这不是一个数据库文件。')
    expect(restoreRejectionText('not-a-library')).toBe('这不是本程序的资料库备份。')
    expect(restoreRejectionText('too-new')).toBe('这份备份来自更新的版本，当前程序打不开。')
    expect(restoreRejectionText('damaged')).toBe('这个备份文件已经损坏，没法恢复。')
    expect(restoreRejectionText('same-file')).toBe('不能拿正在用的资料库当备份。')
  })
})

describe('fileNameOf', () => {
  it('Windows 与 POSIX 路径都只留文件名', () => {
    expect(
      fileNameOf('C:\\Users\\a\\backups\\english-learning-backup-20261118-1904.db')
    ).toBe('english-learning-backup-20261118-1904.db')
    expect(fileNameOf('/home/a/exports/thread-a.jsonl')).toBe('thread-a.jsonl')
    expect(fileNameOf('thread-b.jsonl')).toBe('thread-b.jsonl')
  })
})
