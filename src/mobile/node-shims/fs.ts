/**
 * `node:fs` 的浏览器替身：整个内存文件系统就是它的实现。
 * 同步语义与 Node 一致（这也是领域代码能一行不改的原因）。
 */
export {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  copyFileSync,
  renameSync,
  readdirSync,
  statSync
} from '../vfs'
