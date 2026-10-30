import { useEffect, useState, type CSSProperties } from 'react'
import {
  beatIndex,
  beatPulse,
  clamp,
  easeBack,
  easeInOut,
  easeOut,
  hash,
  INTRO_LENGTH,
  MOMENTS,
  ramp,
} from '../../lib/intro/timeline'

const W = 1920
const H = 1080
const LOGO = `${import.meta.env.BASE_URL}logo-szkoly.png`

/** Dopasowuje scenę 1920×1080 do okna (tablica, iPad, OBS). */
function useFitScale(): number {
  const read = () => Math.min(window.innerWidth / W, window.innerHeight / H)
  const [scale, setScale] = useState(read)
  useEffect(() => {
    const onResize = () => setScale(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

const WORDS = ['Jaka', 'to', 'melodia', '?'] as const
const BARS = 36
const NOTES = 22
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬']

/**
 * Czołówka — cała klatka jest czystą funkcją czasu `t` (sekundy),
 * więc tablica i OBS pokazują dokładnie to samo w tej samej chwili.
 */
export function IntroStage({ t }: { t: number }) {
  const scale = useFitScale()

  const groove = ramp(t, MOMENTS.drop - 0.05, MOMENTS.drop + 0.2) // 0 przed „dropem”, 1 po
  const pulse = beatPulse(t) * (0.35 + 0.65 * groove)
  const finalPulse = beatPulse(t, MOMENTS.finalHits, 0.2)
  const build = easeInOut(ramp(t, 0, MOMENTS.drop))
  const fade = 1 - ramp(t, MOMENTS.fadeOut, INTRO_LENGTH)

  // Błyski: uderzenie przy „dropie” i trzy akcenty na końcu.
  const flash = Math.max(
    Math.exp(-Math.max(0, t - MOMENTS.drop) / 0.18) * (t >= MOMENTS.drop ? 1 : 0),
    finalPulse * 0.85,
  )

  // --- Sowa ---
  const owlIn = easeOut(ramp(t, MOMENTS.owlAppears, MOMENTS.drop))
  const owlPop = easeBack(ramp(t, MOMENTS.drop, MOMENTS.drop + 0.45))
  const owlUp = easeInOut(ramp(t, 5.75, 6.7))
  const owlScale =
    (t < MOMENTS.drop ? 0.55 + 0.25 * owlIn : 0.8 + 0.25 * owlPop) * (1 - 0.36 * owlUp) * (1 + 0.05 * pulse + 0.08 * finalPulse)
  const owlY = -235 * owlUp
  const shake = t < MOMENTS.drop ? (hash(Math.floor(t * 24)) - 0.5) * 10 * owlIn : 0
  const glitchOn = t >= MOMENTS.glitchFrom && t <= MOMENTS.glitchTo && beatIndex(t) % 2 === 0
  const split = (glitchOn ? 14 : 0) * pulse + 22 * finalPulse + (t < MOMENTS.drop ? 6 * owlIn : 0)

  // --- Tytuł ---
  const wordStyle = (i: number): CSSProperties => {
    const at = MOMENTS.words[i]
    const p = ramp(t, at, at + 0.32)
    const s = t < at ? 0 : 2.4 - 1.4 * easeOut(p)
    return {
      opacity: t < at ? 0 : clamp(p * 3),
      transform: `scale(${s})`,
      filter: `blur(${(1 - p) * 10}px)`,
    }
  }
  const titleSplit = (glitchOn ? 8 : 0) * pulse + 14 * finalPulse
  const subtitle = easeOut(ramp(t, MOMENTS.subtitle, MOMENTS.subtitle + 0.6))

  // --- Tło ---
  const rays = 0.15 + 0.35 * build + 0.25 * pulse
  const sweep = Math.sin(t * 1.25) * 24

  return (
    <div className="intro" style={{ opacity: fade }}>
      <div className="intro__stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="intro__bg" />
        <div
          className="intro__rays"
          style={{ opacity: rays, transform: `translate(-50%, -50%) rotate(${t * 14}deg) scale(${1 + 0.04 * pulse})` }}
        />

        {/* Reflektory z dołu sceny */}
        <div className="intro__beam intro__beam--l" style={{ opacity: 0.25 + 0.5 * build, transform: `rotate(${-14 + sweep * 0.8}deg)` }} />
        <div className="intro__beam intro__beam--r" style={{ opacity: 0.25 + 0.5 * build, transform: `rotate(${14 - sweep * 0.8}deg)` }} />

        {/* Unoszące się nuty */}
        {Array.from({ length: NOTES }, (_, i) => {
          const speed = 0.06 + hash(i) * 0.08
          const prog = (t * speed + hash(i + 50)) % 1
          const appear = ramp(t, 0.3 + hash(i + 7) * 2, 1.3 + hash(i + 7) * 2)
          return (
            <span
              key={i}
              className="intro__note"
              style={{
                left: `${4 + hash(i + 20) * 92}%`,
                top: `${110 - prog * 125}%`,
                opacity: appear * (0.25 + 0.5 * hash(i + 3)) * (1 - prog * 0.6),
                fontSize: 36 + hash(i + 9) * 60,
                transform: `rotate(${(hash(i + 30) - 0.5) * 40 + Math.sin(t * 2 + i) * 10}deg)`,
                color: i % 3 === 0 ? '#2cf5ff' : i % 3 === 1 ? '#fb2c55' : '#f5c542',
              }}
            >
              {NOTE_GLYPHS[i % NOTE_GLYPHS.length]}
            </span>
          )
        })}

        {/* Sowa — logo szkoły, z rozszczepieniem kolorów na bitach */}
        <div
          className="intro__owl"
          style={{
            opacity: t < MOMENTS.owlAppears ? 0 : Math.min(1, owlIn * 1.4 + groove),
            transform: `translate(calc(-50% + ${shake}px), calc(-50% + ${owlY}px)) scale(${owlScale})`,
          }}
        >
          <img src={LOGO} alt="" className="intro__owl-ghost intro__owl-ghost--c" style={{ transform: `translate(${-split}px, 0)` }} />
          <img src={LOGO} alt="" className="intro__owl-ghost intro__owl-ghost--m" style={{ transform: `translate(${split}px, 0)` }} />
          <img src={LOGO} alt="Logo szkoły" className="intro__owl-img" />
        </div>

        {/* Tytuł */}
        <h1
          className="intro__title"
          style={{
            transform: `scale(${1 + 0.035 * pulse + 0.07 * finalPulse})`,
            textShadow: `${-titleSplit}px 0 0 rgb(44 245 255 / 0.85), ${titleSplit}px 0 0 rgb(251 44 85 / 0.85), 0 0 ${40 + 60 * pulse}px rgb(245 197 66 / ${0.35 + 0.4 * pulse})`,
          }}
        >
          {WORDS.map((w, i) => (
            <span key={w} className={`intro__word intro__word--${i}`} style={wordStyle(i)}>
              {w}
            </span>
          ))}
        </h1>
        <p className="intro__subtitle" style={{ opacity: subtitle, transform: `translateY(${(1 - subtitle) * 20}px)` }}>
          Szkolny teleturniej muzyczny
        </p>

        {/* Equalizer na dole */}
        <div className="intro__eq">
          {Array.from({ length: BARS }, (_, i) => {
            const center = 1 - Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2)
            const rnd = hash(i * 13 + beatIndex(t) * 7)
            const h = 18 + build * 120 * (0.35 + 0.65 * center) + pulse * 220 * rnd * (0.4 + 0.6 * center) + finalPulse * 110
            return <span key={i} style={{ height: h }} />
          })}
        </div>

        <div className="intro__flash" style={{ opacity: flash }} />
      </div>
    </div>
  )
}
