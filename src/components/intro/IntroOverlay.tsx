import { useServerNow } from '../../lib/game/state'
import type { IntroState } from '../../lib/game/types'
import { IntroStage } from './IntroStage'

/**
 * Muzyka gra z MacBooka hosta, a czas startu dociera do bazy z małym opóźnieniem.
 * Przesuwamy obraz o tyle do przodu, żeby uderzenia trafiały w muzykę.
 */
const AUDIO_LEAD_MS = 120

/** Czołówka na pełnym ekranie (tablica, OBS) — zsynchronizowana z podkładem u hosta. */
export function IntroOverlay({ czolowka }: { czolowka: IntroState | undefined }) {
  const now = useServerNow(Boolean(czolowka))
  if (!czolowka) return null
  const t = (now - czolowka.start + AUDIO_LEAD_MS) / 1000
  if (t < 0 || t > czolowka.dlugosc / 1000 + 0.3) return null
  return <IntroStage t={t} />
}
