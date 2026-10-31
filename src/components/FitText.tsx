import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Klasa napisu (kolor, krój, grubość — rozmiar ustala FitText). */
  className?: string
  style?: CSSProperties
  /**
   * Największy rozmiar — krótki tekst urośnie do niego: [procent szerokości ekranu, górna granica w px].
   * Np. [9, 180] = 9vw, ale nie więcej niż 180 px.
   */
  max: [number, number]
  /** Najmniejszy rozmiar w px — poniżej tekst już się nie zmniejszy. */
  min?: number
  /** Ile linii może zająć tekst (1 = zawsze jedna linia). */
  lines?: number
  /** Jaką część szerokości miejsca może zająć tekst (reszta zostaje na marginesy). */
  widthRatio?: number
  /** Dodatkowa klasa pudełka (np. wyrównanie do lewej w pasku wyników). */
  boxClassName?: string
}

/**
 * Napis, który sam dobiera rozmiar do miejsca: długi tekst maleje i zostawia margines,
 * krótki rośnie aż do `max`. Liczy się na nowo przy zmianie tekstu i rozmiaru ekranu.
 * Zajmuje całą szerokość rodzica (blok), tekst jest wyśrodkowany.
 */
export function FitText({
  children,
  className,
  style,
  max,
  min = 12,
  lines = 1,
  widthRatio = 0.92,
  boxClassName,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [vwMax, pxMax] = max

  useLayoutEffect(() => {
    const box = boxRef.current
    const el = textRef.current
    if (!box || !el) return

    const fit = () => {
      const available = box.clientWidth * widthRatio
      if (available <= 0) return
      el.style.maxWidth = `${available}px`

      const fits = (size: number) => {
        el.style.fontSize = `${size}px`
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || size * 1.3
        return el.scrollWidth <= available + 0.5 && el.offsetHeight <= lineHeight * lines + 1
      }

      // Szukanie binarne największego rozmiaru, który się mieści.
      let lo = min
      let hi = Math.max(min, Math.min(pxMax, (window.innerWidth * vwMax) / 100))
      if (fits(hi)) return
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2
        if (fits(mid)) lo = mid
        else hi = mid
      }
      el.style.fontSize = `${Math.floor(lo)}px`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    // Czcionki z Google ładują się chwilę — po załadowaniu mierzymy jeszcze raz.
    document.fonts?.ready.then(fit).catch(() => {})
    return () => ro.disconnect()
  }, [children, vwMax, pxMax, min, lines, widthRatio])

  return (
    <div ref={boxRef} className={`fit-box ${boxClassName ?? ''}`}>
      <span
        ref={textRef}
        className={className}
        style={{
          display: 'inline-block',
          whiteSpace: lines === 1 ? 'nowrap' : 'normal',
          ...style,
        }}
      >
        {children}
      </span>
    </div>
  )
}
