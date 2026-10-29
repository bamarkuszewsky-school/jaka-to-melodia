import { useCallback, useEffect, useState } from 'react'

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }

const fsDoc = () => document as FsDocument
const fsRoot = () => document.documentElement as FsElement
const readFullscreen = () => Boolean(fsDoc().fullscreenElement ?? fsDoc().webkitFullscreenElement)

/** Pełny ekran z obsługą Safari (iPad) przez prefiks webkit. */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(readFullscreen)

  useEffect(() => {
    const onChange = () => setIsFullscreen(readFullscreen())
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const supported = Boolean(fsRoot().requestFullscreen ?? fsRoot().webkitRequestFullscreen)

  const toggle = useCallback(async () => {
    const doc = fsDoc()
    const el = fsRoot()
    try {
      if (readFullscreen()) {
        await (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.())
      } else {
        await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.())
      }
    } catch (e) {
      console.warn('Pełny ekran niedostępny:', e)
    }
  }, [])

  return { isFullscreen, supported, toggle }
}

/** Nie pozwala ekranowi zgasnąć (tablica, iPady) — tam, gdzie przeglądarka to wspiera. */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        /* np. karta w tle — spróbujemy przy powrocie */
      }
      if (cancelled) lock?.release().catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}
