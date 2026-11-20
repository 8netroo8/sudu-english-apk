/// <reference types="vite/client" />

/** Vite 会把 `?url` 与 `?raw` 导入变成字符串；这里给移动端宿主一个类型出口。 */
declare module '*?url' {
  const url: string
  export default url
}

declare module '*?raw' {
  const text: string
  export default text
}
