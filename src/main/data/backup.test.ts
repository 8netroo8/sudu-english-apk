import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type AppDatabase } from '../db/database'
import {
  migrate,
  migrations,
  readSchemaVersion,
  LATEST_SCHEMA_VERSION
} from '../db/migrations'
import { readSetting, readThemePreference, writeSetting } from '../db/settings'
import { readArticleDetail } from '../library/queries'
import {
  BackupTargetError,
  createBackup,
  inspectBackupFile,
  readLastBackup,
  readLastSnapshot,
  restoreBackup
} from './backup'

let directory: string
let database: AppDatabase

const now = '2026-11-18T11:00:00.000Z'
const later = '2026-11-18T12:00:00.000Z'
const evenLater = '2026-11-18T13:00:00.000Z'

/** 用一条普通设置当「备份之后又改过」的证据，比造一篇语料轻。 */
const PROBE = 'test.probe'

function snapshots(): string {
  return join(directory, 'snapshots')
}

function backupFile(name = 'backup.db'): string {
  return join(directory, 'chosen', name)
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'english-learning-backup-'))
  database = openDatabase(join(directory, 'library.db'))
  migrate(database)
})

afterEach(() => {
  database.close()
  rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
})

describe('createBackup', () => {
  it('备份是一份独立的整库副本，路径不必事先存在', async () => {
    writeSetting(database, 'theme', 'dark')
    const file = backupFile()

    const backup = await createBackup(database, { file, now })

    expect(backup).toMatchObject({ file, at: now, kind: 'manual', exists: true })
    expect(backup.bytes).toBe(statSync(file).size)
    expect(backup.bytes).toBeGreaterThan(0)
    expect(existsSync(`${file}-wal`)).toBe(false)
    expect(existsSync(`${file}-shm`)).toBe(false)

    const copy = openDatabase(file)
    try {
      expect(readThemePreference(copy)).toBe('dark')
      expect(readSchemaVersion(copy)).toBe(LATEST_SCHEMA_VERSION)
    } finally {
      copy.close()
    }
  })

  it('记下上次备份的时间、路径与体积', async () => {
    const file = backupFile()
    const backup = await createBackup(database, { file, now })

    expect(readLastBackup(database)).toMatchObject({
      at: now,
      file,
      bytes: backup.bytes,
      kind: 'manual',
      exists: true
    })
  })

  it('备份文件被挪走后，仍记得时间，但标出文件已不在原处', async () => {
    const file = backupFile()
    await createBackup(database, { file, now })
    rmSync(file)

    const last = readLastBackup(database)

    expect(last).toMatchObject({ at: now, exists: false })
  })

  it('没有备份过时不编造一份', () => {
    expect(readLastBackup(database)).toBeNull()
  })
})

describe('restoreBackup', () => {
  it('恢复用备份内容整体替换本机资料库，并先留一份恢复前快照', async () => {
    writeSetting(database, 'theme', 'dark')
    writeSetting(database, PROBE, '备份前')
    const file = backupFile()
    await createBackup(database, { file, now })

    writeSetting(database, 'theme', 'light')
    writeSetting(database, PROBE, '备份之后')

    const outcome = await restoreBackup(database, {
      file,
      snapshotDirectory: snapshots(),
      now: later
    })

    expect(outcome.status).toBe('restored')
    expect(readThemePreference(database)).toBe('dark')
    expect(readSetting(database, PROBE)).toBe('备份前')

    if (outcome.status !== 'restored') {
      throw new Error('恢复没有成功')
    }
    expect(outcome.snapshot).toMatchObject({ kind: 'before-restore', at: later, exists: true })
    expect(existsSync(outcome.snapshot.file)).toBe(true)
    // 恢复动作本身也记进「上次备份」：界面上的时间与体积不会因为恢复而消失。
    expect(readLastBackup(database)).toMatchObject({ file, exists: true })

    // 快照里是恢复前那份库：备份之后的改动还在。
    const snapshot = openDatabase(outcome.snapshot.file)
    try {
      expect(readSetting(snapshot, PROBE)).toBe('备份之后')
    } finally {
      snapshot.close()
    }
  })

  it('快照本身也能再换回来，恢复错了还有退路', async () => {
    writeSetting(database, PROBE, '恢复前')
    const file = backupFile()
    await createBackup(database, { file, now })
    writeSetting(database, PROBE, '备份之后')
    const first = await restoreBackup(database, {
      file,
      snapshotDirectory: snapshots(),
      now: later
    })
    if (first.status !== 'restored') {
      throw new Error('第一次恢复没有成功')
    }
    expect(readSetting(database, PROBE)).toBe('恢复前')

    const back = await restoreBackup(database, {
      file: first.snapshot.file,
      snapshotDirectory: snapshots(),
      now: evenLater
    })

    expect(back.status).toBe('restored')
    expect(readSetting(database, PROBE)).toBe('备份之后')
    expect(readLastSnapshot(database)).toMatchObject({ at: evenLater, exists: true })
  })

  it('同一秒里恢复两次，快照不互相覆盖', async () => {
    const file = backupFile()
    await createBackup(database, { file, now })

    const first = await restoreBackup(database, {
      file,
      snapshotDirectory: snapshots(),
      now: later
    })
    const second = await restoreBackup(database, {
      file,
      snapshotDirectory: snapshots(),
      now: later
    })

    if (first.status !== 'restored' || second.status !== 'restored') {
      throw new Error('恢复没有成功')
    }
    expect(second.snapshot.file).not.toBe(first.snapshot.file)
    expect(existsSync(first.snapshot.file)).toBe(true)
    expect(existsSync(second.snapshot.file)).toBe(true)
  })

  it('带完成时间的当前版本备份恢复后仍是已读完，进度读出 100%', async () => {
    database
      .prepare(
        `INSERT INTO article (
           id, title, kind, kind_label, session_key, session_label, set_label,
           exam_year, exam_month, exam_set, word_count, body_text, source_pdf,
           source_sha256, ordinal, completed_at
         ) VALUES ('a', 'A', 'careful_reading', '仔细阅读', '2026-06', '2026年6月', '第1套',
           2026, 6, 1, 3, 'Body.', 'a.pdf', 'sha', 1, ?)`
      )
      .run(now)
    const file = backupFile()
    await createBackup(database, { file, now })

    // 恢复到本机前先抹掉完成时间：恢复该把它带回来。
    database.prepare('UPDATE article SET completed_at = NULL').run()
    const outcome = await restoreBackup(database, {
      file,
      snapshotDirectory: snapshots(),
      now: later
    })

    expect(outcome.status).toBe('restored')
    expect(readSchemaVersion(database)).toBe(LATEST_SCHEMA_VERSION)
    expect(readArticleDetail(database, 'a')?.progress).toEqual({
      state: 'completed',
      percent: 100
    })
  })

  it('旧版本（还没有完成时间列）的备份恢复后就地补上可空列，旧数据不丢', async () => {
    const oldFile = join(directory, 'v9-schema.db')
    const oldDatabase = openDatabase(oldFile)
    try {
      migrate(oldDatabase, { migrations: migrations.filter((migration) => migration.version <= 9) })
      oldDatabase
        .prepare(
          `INSERT INTO article (
             id, title, kind, kind_label, session_key, session_label, set_label,
             exam_year, exam_month, exam_set, word_count, body_text, source_pdf,
             source_sha256, ordinal, last_opened_at, last_paragraph_id, last_sentence_index
           ) VALUES ('old', 'Old', 'careful_reading', '仔细阅读', '2026-06', '2026年6月', '第1套',
             2026, 6, 1, 3, 'Body.', 'a.pdf', 'sha', 1, '2026-11-18T08:00:00.000Z', '1', 0)`
        )
        .run()
      oldDatabase
        .prepare(
          `INSERT INTO paragraph (article_id, id, ordinal, text, page_start, page_end)
           VALUES ('old', '1', 0, 'One. Two.', 1, 1)`
        )
        .run()
      oldDatabase
        .prepare(
          `INSERT INTO sentence (article_id, paragraph_id, ordinal, text, char_start, char_end, page)
           VALUES ('old', '1', 0, 'One.', 0, 4, 1), ('old', '1', 1, ' Two.', 4, 9, 1)`
        )
        .run()
      // 应用写出的备份都是单文件（DELETE 日志）；夹具也收成单文件，避开 WAL 残余。
      oldDatabase.pragma('journal_mode = DELETE')
    } finally {
      oldDatabase.close()
    }

    const outcome = await restoreBackup(database, {
      file: oldFile,
      snapshotDirectory: snapshots(),
      now: later
    })

    expect(outcome.status).toBe('restored')
    expect(readSchemaVersion(database)).toBe(LATEST_SCHEMA_VERSION)
    expect(
      (database.pragma('table_info(article)') as { name: string }[]).map((column) => column.name)
    ).toContain('completed_at')
    expect(readArticleDetail(database, 'old')?.progress).toEqual({ state: 'reading', percent: 50 })
    expect(
      database.prepare('SELECT completed_at FROM article WHERE id = ?').get('old')
    ).toEqual({ completed_at: null })
  })

  it('旧版本的备份恢复后就地升到当前 schema，数据照常可读', async () => {
    const oldFile = join(directory, 'old-schema.db')
    const oldDatabase = openDatabase(oldFile)
    try {
      migrate(oldDatabase, { migrations: migrations.slice(0, 3) })
      writeSetting(oldDatabase, 'theme', 'dark')
    } finally {
      oldDatabase.close()
    }

    const outcome = await restoreBackup(database, {
      file: oldFile,
      snapshotDirectory: snapshots(),
      now: later
    })

    expect(outcome.status).toBe('restored')
    expect(readSchemaVersion(database)).toBe(LATEST_SCHEMA_VERSION)
    expect(readThemePreference(database)).toBe('dark')
    // 旧备份就地升级时会补上这一版新增的「稍后看」表。
    expect(
      database
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'entry_later'")
        .get()
    ).toBeDefined()
  })

  it('当前版本的备份缺了稍后看表时不会被当成可恢复的备份', async () => {
    const file = backupFile('missing-later.db')
    await createBackup(database, { file, now })
    // 版本号写着最新、表却不齐：只看 setting 一张表就会把它当成好备份。
    const copy = openDatabase(file)
    try {
      copy.exec('DROP TABLE entry_later')
    } finally {
      copy.close()
    }

    expect(inspectBackupFile(file)).toEqual({ ok: false, reason: 'not-a-library' })
    expect(
      await restoreBackup(database, {
        file,
        snapshotDirectory: snapshots(),
        now: later
      })
    ).toEqual({ status: 'rejected', reason: 'not-a-library' })
  })

  it('版本高于当前程序的备份拒绝恢复，本机数据不动', async () => {
    writeSetting(database, PROBE, '还在')
    writeSetting(database, 'theme', 'dark')
    const futureFile = join(directory, 'future.db')
    const future = openDatabase(futureFile)
    try {
      future.exec('CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
      future.pragma(`user_version = ${LATEST_SCHEMA_VERSION + 1}`)
    } finally {
      future.close()
    }

    const outcome = await restoreBackup(database, {
      file: futureFile,
      snapshotDirectory: snapshots(),
      now: later
    })

    expect(outcome).toEqual({ status: 'rejected', reason: 'too-new' })
    expect(readSetting(database, PROBE)).toBe('还在')
    expect(readThemePreference(database)).toBe('dark')
    expect(existsSync(snapshots())).toBe(false)
  })

  it('不是本程序的库拒绝恢复', async () => {
    const foreignFile = join(directory, 'foreign.db')
    const foreign = openDatabase(foreignFile)
    try {
      foreign.exec('CREATE TABLE notes (body TEXT)')
    } finally {
      foreign.close()
    }

    expect(
      await restoreBackup(database, {
        file: foreignFile,
        snapshotDirectory: snapshots(),
        now: later
      })
    ).toEqual({ status: 'rejected', reason: 'not-a-library' })
  })

  it('根本不是数据库的文件拒绝恢复', async () => {
    const textFile = join(directory, 'not-a-database.db')
    writeFileSync(textFile, '这不是数据库')

    expect(
      await restoreBackup(database, {
        file: textFile,
        snapshotDirectory: snapshots(),
        now: later
      })
    ).toEqual({ status: 'rejected', reason: 'not-a-database' })
  })

  it('找不到备份文件时说找不到', async () => {
    expect(
      await restoreBackup(database, {
        file: join(directory, 'no-such-backup.db'),
        snapshotDirectory: snapshots(),
        now: later
      })
    ).toEqual({ status: 'rejected', reason: 'missing' })
  })

  it('不能拿正在用的库文件当备份来源', async () => {
    expect(
      await restoreBackup(database, {
        file: database.name,
        snapshotDirectory: snapshots(),
        now: later
      })
    ).toEqual({ status: 'rejected', reason: 'same-file' })
  })

  it('备份不能写到正在用的库文件上', async () => {
    await expect(createBackup(database, { file: database.name, now })).rejects.toBeInstanceOf(
      BackupTargetError
    )
    expect(readLastBackup(database)).toBeNull()
  })
})

describe('inspectBackupFile', () => {
  it('挑选备份文件时先看清版本、体积与时间，不动本机数据', async () => {
    const file = backupFile()
    await createBackup(database, { file, now })

    const inspection = inspectBackupFile(file)

    expect(inspection).toMatchObject({
      ok: true,
      schemaVersion: LATEST_SCHEMA_VERSION,
      bytes: statSync(file).size
    })
    if (inspection.ok) {
      expect(Number.isNaN(Date.parse(inspection.createdAt))).toBe(false)
    }
  })

  it('不是本程序的库不会被当成备份', () => {
    const foreignFile = join(directory, 'foreign-inspect.db')
    const foreign = openDatabase(foreignFile)
    try {
      foreign.exec('CREATE TABLE notes (body TEXT)')
    } finally {
      foreign.close()
    }

    expect(inspectBackupFile(foreignFile)).toEqual({ ok: false, reason: 'not-a-library' })
  })

  it('版本号写着本程序、表却不齐的文件不会被当成备份', () => {
    const fakeFile = join(directory, 'fake-library.db')
    const fake = openDatabase(fakeFile)
    try {
      fake.exec('CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
      fake.pragma(`user_version = ${LATEST_SCHEMA_VERSION}`)
    } finally {
      fake.close()
    }

    expect(inspectBackupFile(fakeFile)).toEqual({ ok: false, reason: 'not-a-library' })
  })

  it('版本号写着最新、表也齐但没有完成时间列的文件不会被当成备份', () => {
    // 停在加完成时间列之前（v10）的库：表全在，只差 article.completed_at；
    // 把版本号谎报成最新时，列检查必须把它拦下。
    const fakeFile = join(directory, 'fake-columns.db')
    const fake = openDatabase(fakeFile)
    try {
      migrate(fake, { migrations: migrations.filter((migration) => migration.version <= 10) })
      fake.pragma(`user_version = ${LATEST_SCHEMA_VERSION}`)
    } finally {
      fake.close()
    }

    expect(inspectBackupFile(fakeFile)).toEqual({ ok: false, reason: 'not-a-library' })
  })

  it('读不了的目标（比如目录）说不是数据库，不把异常抛给界面', () => {
    expect(inspectBackupFile(directory)).toEqual({ ok: false, reason: 'not-a-database' })
  })
})
