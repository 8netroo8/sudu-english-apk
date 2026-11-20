/**
 * better-sqlite3 的替身：API 形状照抄桌面版用到的那些，
 * 底下换成 sql.js（SQLite 编译成 WebAssembly，纯内存库）。
 *
 * 只覆盖领域代码真正用到的部分：prepare 的 run/get/all、exec、transaction、
 * pragma、close。没有 named 参数、没有 iterate/pluck/raw，这些桌面版也没用。
 */
import initSqlJs, {
  type Database as SqlJsDatabase,
  type SqlJsConfig,
  type SqlJsStatic,
  type Statement as SqlJsStatement
} from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { hasFile, putBinaryFile, readBinary } from './vfs'

let engine: SqlJsStatic | null = null

/** 由 boot 在打开任何库之前调用一次。 */
export async function initSqlite(): Promise<void> {
  if (engine !== null) return
  // @types/sql.js 把 useOldExtensionFunctions 标成必填，但运行时缺省就是我们要的行为，别为类型检查改语义。
  const config = { locateFile: () => wasmUrl } as unknown as SqlJsConfig
  engine = await initSqlJs(config)
}

function requireEngine(): SqlJsStatic {
  if (engine === null) {
    throw new Error('SQLite 引擎还没初始化')
  }
  return engine
}

type SqlValue = string | number | Uint8Array | null

function toSqlValue(value: unknown): SqlValue {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'bigint') return Number(value)
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array) return value
  return value as string | number
}

export type RunResult = { changes: number; lastInsertRowid: number }

type Row = Record<string, unknown>

/** 语句对象：get / all / run 三件套，可反复调用。 */
export class Statement<Bind extends unknown[] = unknown[], Result = Row> {
  private readonly database: Database
  private readonly sql: string
  private statement: SqlJsStatement

  constructor(database: Database, sql: string) {
    this.database = database
    this.sql = sql
    this.statement = database.raw.prepare(sql)
  }

  private bind(params: unknown[]): void {
    this.statement.reset()
    if (params.length > 0) {
      this.statement.bind(params.map(toSqlValue))
    }
  }

  private take(): Result | undefined {
    if (!this.statement.step()) return undefined
    const row = this.statement.getAsObject()
    return this.statement.getColumnNames().length === 0 ? (undefined as Result) : (row as Result)
  }

  get(...params: Bind): Result | undefined {
    this.bind(params as unknown[])
    try {
      return this.take()
    } finally {
      this.statement.reset()
    }
  }

  all(...params: Bind): Result[] {
    this.bind(params as unknown[])
    const rows: Result[] = []
    try {
      while (this.statement.step()) {
        rows.push(this.statement.getAsObject() as Result)
      }
    } finally {
      this.statement.reset()
    }
    return rows
  }

  run(...params: Bind): RunResult {
    this.bind(params as unknown[])
    try {
      while (this.statement.step()) {
        // 把结果集走完，INSERT ... RETURNING 之类的语句才真正生效。
      }
    } finally {
      this.statement.reset()
    }
    const database = this.database
    const changes = database.rowsModified
    const lastInsertRowid = database.lastInsertRowid()
    database.markDirty()
    return { changes, lastInsertRowid }
  }

  /**
   * 有些调用处先拿语句再循环 run（例如迁移里按表名批处理），
   * 这里保留 sql 文本方便调试。
   */
  get source(): string {
    return this.sql
  }

  free(): void {
    this.statement.free()
  }
}

export class Database {
  readonly raw: SqlJsDatabase
  readonly path: string | null
  private readonly readonly: boolean
  private dirty = false
  private changeListener: (() => void) | null = null
  private transactionDepth = 0

  constructor(file: string | Uint8Array, options?: { readonly?: boolean; fileMustExist?: boolean }) {
    const Engine = requireEngine()
    this.readonly = options?.readonly === true
    if (typeof file === 'string') {
      this.path = file
      if (hasFile(file)) {
        this.raw = new Engine.Database(readBinary(file))
      } else if (options?.fileMustExist === true) {
        throw new Error(`数据库文件不存在：${file}`)
      } else {
        this.raw = new Engine.Database()
      }
    } else {
      this.path = null
      this.raw = new Engine.Database(file)
    }
  }

  /** 数据库字节变化后通知外部（boot 用它去抖动落盘）。 */
  onChange(listener: () => void): void {
    this.changeListener = listener
  }

  markDirty(): void {
    if (this.readonly) return
    this.dirty = true
    this.changeListener?.()
  }

  get rowsModified(): number {
    return this.raw.getRowsModified()
  }

  get inTransaction(): boolean {
    return this.transactionDepth > 0
  }

  lastInsertRowid(): number {
    const result = this.raw.exec('SELECT last_insert_rowid() AS id')
    const value = result[0]?.values[0]?.[0]
    return typeof value === 'number' ? value : 0
  }

  prepare<Bind extends unknown[] = unknown[], Result = Row>(sql: string): Statement<Bind, Result> {
    return new Statement<Bind, Result>(this, sql)
  }

  exec(sql: string): this {
    this.raw.run(sql)
    this.markDirty()
    return this
  }

  pragma(expression: string): unknown {
    const results = this.raw.exec(`PRAGMA ${expression}`)
    const first = results[0]
    if (first === undefined || first.values.length === 0) {
      return undefined
    }
    if (first.values.length === 1 && first.values[0]!.length === 1) {
      return first.values[0]![0]
    }
    return first.values.map((values) => values[0])
  }

  /**
   * better-sqlite3 的 transaction 返回一个可直接调用的函数，
   * 嵌套调用时要换用 savepoint，这里按深度处理。
   */
  transaction<T extends (...args: never[]) => unknown>(fn: T): T & {
    immediate: T
    deferred: T
    exclusive: T
  } {
    const run = ((...args: unknown[]) => {
      const savepoint = `sp_${this.transactionDepth}`
      const outermost = this.transactionDepth === 0
      if (outermost) {
        this.raw.run('BEGIN')
      } else {
        this.raw.run(`SAVEPOINT ${savepoint}`)
      }
      this.transactionDepth += 1
      try {
        const result = fn(...(args as never[]))
        this.transactionDepth -= 1
        if (outermost) {
          this.raw.run('COMMIT')
        } else {
          this.raw.run(`RELEASE ${savepoint}`)
        }
        return result
      } catch (error) {
        this.transactionDepth -= 1
        if (outermost) {
          this.raw.run('ROLLBACK')
        } else {
          this.raw.run(`ROLLBACK TO ${savepoint}`)
          this.raw.run(`RELEASE ${savepoint}`)
        }
        throw error
      }
    }) as unknown as T & { immediate: T; deferred: T; exclusive: T }
    run.immediate = run
    run.deferred = run
    run.exclusive = run
    return run
  }

  /** 整库导出成 SQLite 文件字节：移动端靠它落盘。 */
  exportBytes(): Uint8Array {
    return this.raw.export()
  }

  /**
   * better-sqlite3 的在线备份：桌面版靠它把库整份复制到目标文件。
   * 内存库里没有并发写，导出一份字节写到目标路径即可，语义一样。
   */
  async backup(destination: string): Promise<number> {
    const bytes = this.exportBytes()
    putBinaryFile(destination, bytes)
    return bytes.byteLength
  }

  flushToFile(): void {
    if (this.path === null) return
    putBinaryFile(this.path, this.exportBytes())
    this.dirty = false
  }

  get needsFlush(): boolean {
    return this.dirty
  }

  close(): void {
    if (this.dirty) {
      try {
        this.flushToFile()
      } catch {
        // 关库时写不出去也没有别的办法，不拦住退出。
      }
    }
    this.raw.close()
  }
}

export default Database
