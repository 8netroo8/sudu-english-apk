/**
 * `node:path` 的浏览器替身：只保留这个项目实际用到的五个函数，
 * 内部仍走内存文件系统的规范化逻辑，保证 `/data/backups/x.db` 这种路径前后一致。
 */
export {
  joinPath as join,
  resolvePath as resolve,
  basenamePath as basename,
  dirnamePath as dirname,
  extnamePath as extname,
  normalizePath as normalize
} from '../vfs'

export const sep = '/'
