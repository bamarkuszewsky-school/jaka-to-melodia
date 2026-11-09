import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { formatSec } from '../../lib/library/library'

/** Ile słupków głośności liczymy dla całego utworu (dalej skalowane do szerokości). */
const BUCKETS = 2400

interface Peaks {
  peaks: Float32Array
  duration: number
}

const cache = new Map<File, Promise<Peaks>>()

/** Dekoduje plik w przeglądarce i liczy obwiednię głośności (raz na plik). */
function loadPeaks(file: File): Promise<Peaks> {
  let p = cache.get(file)
  if (!p) {
    p = (async () => {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      try {
        const buf = await ctx.decodeAudioData(await file.arrayBuffer())
        const peaks = new Float32Array(BUCKETS)
        const per = Math.max(1, Math.floor(buf.length / BUCKETS))
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const data = buf.getChannelData(c)
          for (let b = 0; b < BUCKETS; b++) {
            let max = 0
            const from = b * per
            const to = Math.min(data.length, from + per)
            // Co 4. próbka wystarcza do obrazka, a jest 4× szybciej.
            for (let i = from; i < to; i += 4) {
              const v = Math.abs(data[i])
              if (v > max) max = v
            }
            if (max > peaks[b]) peaks[b] = max
          }
        }
        let top = 0
        for (const v of peaks) top = Math.max(top, v)
        if (top > 0) for (let b = 0; b < BUCKETS; b++) peaks[b] = peaks[b] / top
        return { peaks, duration: buf.duration }
      } finally {
        ctx.close().catch(() => {})
      }
    })()
    cache.set(file, p)
    p.catch(() => cache.delete(file))
  }
  return p
}

export type ClickMode = 'start' | 'refren' | 'seek'

interface Props {
  file: File
  audioRef: RefObject<HTMLAudioElement | null>
  start?: number
  refren?: number
  /** Długość fragmentu od startu (rundy 1–2: 15 s) — zaznaczona na wykresie. */
  window?: number
  showStart: boolean
  mode: ClickMode
  onPick: (mode: ClickMode, sec: number) => void
}

/**
 * Wykres głośności utworu: widać, gdzie zaczyna się muzyka, gdzie robi się głośno (refren),
 * i można od razu kliknąć start albo refren — bez słuchania.
 */
export function Waveform({ file, audioRef, start, refren, window: win, showStart, mode, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<Peaks | null>(null)
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [width, setWidth] = useState(0)
  const [pos, setPos] = useState(0)

  useEffect(() => {
    let alive = true
    loadPeaks(file).then(
      (d) => alive && setData(d),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [file])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Pozycja odtwarzania (pionowa kreska).
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const a = audioRef.current
      if (a) setPos((p) => (Math.abs(p - a.currentTime) > 0.04 ? a.currentTime : p))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [audioRef])

  const draw = useCallback(() => {
    const c = canvasRef.current
    if (!c || !data || width === 0) return
    const css = getComputedStyle(c)
    const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
    const dpr = window.devicePixelRatio || 1
    const h = 120
    c.width = Math.round(width * dpr)
    c.height = Math.round(h * dpr)
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, width, h)
    const d = data.duration
    const x = (sec: number) => (sec / d) * width
    const mid = h / 2

    // Okno fragmentu (15 s od startu).
    if (showStart && start !== undefined && win) {
      g.fillStyle = color('--wave-window', 'rgba(245,197,66,0.16)')
      g.fillRect(x(start), 0, Math.max(2, x(Math.min(d, start + win)) - x(start)), h)
    }

    // Słupki głośności.
    const bars = Math.max(1, Math.floor(width / 2))
    const played = x(pos)
    for (let i = 0; i < bars; i++) {
      const from = Math.floor((i / bars) * BUCKETS)
      const to = Math.max(from + 1, Math.floor(((i + 1) / bars) * BUCKETS))
      let v = 0
      for (let b = from; b < to; b++) v = Math.max(v, data.peaks[b])
      const bh = Math.max(1, v * (mid - 6))
      const bx = (i / bars) * width
      g.fillStyle = bx < played ? color('--wave-played', '#8fd6ff') : color('--wave-bar', '#5a6a98')
      g.fillRect(bx, mid - bh, Math.max(1, width / bars - 0.6), bh * 2)
    }

    // Podziałka co 30 s.
    g.fillStyle = color('--wave-text', '#9aa8d6')
    g.font = '11px system-ui, sans-serif'
    for (let t = 30; t < d; t += 30) {
      g.fillRect(x(t), h - 6, 1, 6)
      g.fillText(formatSec(t).replace(/,\d$/, ''), x(t) + 3, h - 2)
    }

    const marker = (sec: number, col: string, label: string) => {
      g.fillStyle = col
      g.fillRect(x(sec) - 1, 0, 2, h)
      g.font = 'bold 11px system-ui, sans-serif'
      const tw = g.measureText(label).width + 8
      const lx = Math.min(width - tw, Math.max(0, x(sec) - 1))
      g.fillRect(lx, 0, tw, 16)
      g.fillStyle = '#111'
      g.fillText(label, lx + 4, 12)
    }
    if (showStart && start !== undefined) marker(start, color('--wave-start', '#f5c542'), `START ${formatSec(start)}`)
    if (refren !== undefined) marker(refren, color('--wave-refren', '#ff5c8a'), `REFREN ${formatSec(refren)}`)

    // Odtwarzanie i kursor myszy.
    g.fillStyle = '#ffffff'
    g.fillRect(played - 0.5, 0, 1, h)
    if (hover !== null) {
      g.fillStyle = 'rgba(255,255,255,0.5)'
      g.fillRect(x(hover) - 0.5, 0, 1, h)
    }
  }, [data, width, start, refren, win, showStart, pos, hover])

  useEffect(draw, [draw])

  const secAt = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!data) return 0
    const r = e.currentTarget.getBoundingClientRect()
    const sec = ((e.clientX - r.left) / r.width) * data.duration
    return Math.max(0, Math.min(data.duration, Math.round(sec * 10) / 10))
  }

  if (failed) return <p className="muted small">Nie udało się odczytać pliku, więc wykresu nie ma — ustaw czas ręcznie.</p>

  return (
    <div className={`wave mode-${mode}`} ref={wrapRef}>
      {!data && <div className="wave__loading">Liczę wykres głośności…</div>}
      <canvas
        ref={canvasRef}
        className="wave__canvas"
        style={{ height: 120 }}
        onPointerMove={(e) => setHover(secAt(e))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => data && onPick(mode, secAt(e))}
        aria-label="Wykres głośności — kliknij, żeby ustawić czas"
      />
      {hover !== null && data && (
        <span className="wave__tip" style={{ left: `${(hover / data.duration) * 100}%` }}>
          {formatSec(hover)}
        </span>
      )}
    </div>
  )
}
