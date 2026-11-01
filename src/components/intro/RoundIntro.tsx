import { useServerNow } from '../../lib/game/state'
import type { RoundIntroState } from '../../lib/game/types'
import { beatPulse, easeBack, easeOut, hash, ramp } from '../../lib/intro/timeline'
import { ROUND_BEATS, ROUND_HITS, ROUND_INTRO_LENGTH, ROUND_TITLES } from '../../lib/intro/roundTimeline'
import { useFitScale } from '../../lib/intro/useFitScale'

const AUDIO_LEAD_MS = 120
const BARS = 28

/** Zapowiedź rundy na pełnym ekranie (tablica, OBS) — zgrana z dźwiękiem u hosta. */
export function RoundIntroOverlay({ zapowiedz }: { zapowiedz: RoundIntroState | undefined }) {
  const now = useServerNow(Boolean(zapowiedz))
  if (!zapowiedz) return null
  const length = (zapowiedz.dlugosc ?? ROUND_INTRO_LENGTH * 1000) / 1000
  const t = (now - zapowiedz.start + AUDIO_LEAD_MS) / 1000
  if (t < 0 || t > length + 0.2) return null
  return <RoundIntroStage t={t} runda={zapowiedz.runda} length={length} />
}

/** Klatka intra rundy jako czysta funkcja czasu `t`. */
export function RoundIntroStage({ t, runda, length }: { t: number; runda: number; length: number }) {
  const scale = useFitScale()
  const title = ROUND_TITLES[runda] ?? ROUND_TITLES[1]
  const pulse = beatPulse(t, ROUND_BEATS, 0.14)
  const hit = beatPulse(t, [ROUND_HITS.number, ROUND_HITS.subtitle], 0.25)
  const fadeIn = ramp(t, 0, 0.25)
  const fade = Math.min(fadeIn, 1 - ramp(t, Math.min(ROUND_HITS.fadeOut, length - 0.5), length))
  const labelIn = easeOut(ramp(t, 0.15, 1.1))
  const numberIn = easeBack(ramp(t, ROUND_HITS.number, ROUND_HITS.number + 0.45))
  const subIn = easeOut(ramp(t, ROUND_HITS.subtitle, ROUND_HITS.subtitle + 0.5))
  const split = 18 * hit + 5 * pulse

  return (
    <div className="intro rintro" style={{ opacity: fade }}>
      <div className="intro__stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="intro__bg" />
        <div
          className="intro__rays"
          style={{ opacity: 0.35 + 0.4 * pulse, transform: `translate(-50%, -50%) rotate(${t * -22}deg) scale(${1 + 0.05 * hit})` }}
        />
        <p
          className="rintro__label"
          style={{ opacity: labelIn, letterSpacing: `${0.6 - 0.35 * labelIn}em`, transform: `translateY(${(1 - labelIn) * -40}px)` }}
        >
          {title.label}
        </p>
        {title.number && (
          <p
            className={`rintro__number ${title.number.length > 2 ? 'is-word' : ''}`}
            style={{
              opacity: t < ROUND_HITS.number ? 0 : 1,
              transform: `translate(-50%, -50%) scale(${(0.2 + 0.8 * numberIn) * (1 + 0.06 * pulse)})`,
              textShadow: `${-split}px 0 0 rgb(44 245 255 / 0.85), ${split}px 0 0 rgb(251 44 85 / 0.85), 0 0 ${60 + 80 * pulse}px rgb(245 197 66 / 0.6)`,
            }}
          >
            {title.number}
          </p>
        )}
        <p className="rintro__subtitle" style={{ opacity: subIn, transform: `translateY(${(1 - subIn) * 30}px)` }}>
          {title.subtitle}
        </p>
        <div className="intro__eq">
          {Array.from({ length: BARS }, (_, i) => {
            const center = 1 - Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2)
            const rnd = hash(i * 7 + Math.floor(t * 8) * 13)
            return <span key={i} style={{ height: 20 + 60 * labelIn * center + pulse * 200 * rnd * (0.4 + 0.6 * center) + hit * 120 }} />
          })}
        </div>
        <div className="intro__flash" style={{ opacity: hit * 0.75 }} />
      </div>
    </div>
  )
}
