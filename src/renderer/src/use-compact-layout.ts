import { useEffect, useState } from 'react'

/** 和 styles/mobile.css 的壳层断点保持一致：≤820px 视为手机/窄窗口。 */
const QUERY = '(max-width: 820px)'

function matchesNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(QUERY).matches
}

/**
 * 手机上没有右边那一栏的位置：列表项要「点一下就打开」，而不是先选中、
 * 再去详情栏按「继续阅读」。返回 true 时调用方应该直接跳转。
 */
export function useCompactLayout(): boolean {
  const [compact, setCompact] = useState(matchesNow)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(QUERY)
    const update = (): void => setCompact(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return compact
}
