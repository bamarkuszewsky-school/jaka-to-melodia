import { useEffect } from 'react'
import { IntroOverlay } from '../components/intro/IntroOverlay'
import { useBuzzes } from '../lib/buzzTest'
import { useGame } from '../lib/game/state'
import { usePresence } from '../lib/presence'
import { nut, poNutach } from '../lib/game/rules3'
import { labelForKey, stationLabel, useStationNames } from '../lib/stations'

/**
 * Nakładka do OBS / vMix: przezroczyste tło 1920×1080.
 * W grze: kto pierwszy wcisnął guzik i wynik po odsłonięciu. Poza grą: test przycisków.
 * TODO: pełna animacja i wygląd nakładki.
 */
export function StreamPage() {
  usePresence('stream')
  const buzzes = useBuzzes()
  const names = useStationNames()
  const game = useGame()

  useEffect(() => {
    document.documentElement.classList.add('transparent')
    return () => document.documentElement.classList.remove('transparent')
  }, [])

  const p = game.pytanie
  let lower: { label: string; value: string; key: string } | null = null

  const p3 = game.pytanie3
  const r3 = game.runda3
  if (game.runda === 3 && r3) {
    if (p3?.faza === 'licytacja' && p3.licytacja.nuty && p3.licytacja.prowadzi) {
      lower = {
        key: `bid-${p3.haslo}-${p3.licytacja.nuty}`,
        label: `Licytacja · ${p3.wykonawca}`,
        value: `${labelForKey(names, p3.licytacja.prowadzi)}: ${p3.licytacja.nuty} ${nut(p3.licytacja.nuty)}`,
      }
    } else if ((p3?.faza === 'granie' || p3?.faza === 'odpowiedz') && p3.gra && p3.nuty) {
      lower = {
        key: `play-${p3.haslo}`,
        label: `${labelForKey(names, p3.gra)} zgaduje ${poNutach(p3.nuty)}`,
        value: `${p3.wartosc} pkt do zdobycia`,
      }
    } else if (p3?.faza === 'odslona' && p3.wynik) {
      lower = {
        key: `r3-${p3.haslo}`,
        label: p3.wynik.trafil
          ? `+${p3.wynik.punkty} pkt dla ${labelForKey(names, p3.wynik.stanowisko)}`
          : `Pudło! Punkt dla ${labelForKey(names, p3.wynik.stanowisko)}`,
        value: `${p3.wynik.tytul} — ${p3.wynik.wykonawca}`,
      }
    } else if (!p3 && r3.zwyciezca) {
      lower = { key: `final-${r3.zwyciezca}`, label: 'Do finału przechodzi', value: labelForKey(names, r3.zwyciezca) }
    }
  } else if (game.runda !== undefined) {
    if (p?.faza === 'odpowiedz' && p.odpowiada) {
      lower = {
        key: `buzz-${p.odpowiada}-${p.odpowiedzStart}`,
        label: `Przedstawiciel klasy ${labelForKey(names, p.odpowiada)} pierwszy wcisnął guzik!`,
        value: p.dogrywka ? 'Dogrywka' : `${p.wartosc} pkt do zdobycia`,
      }
    } else if (p?.faza === 'odslona' && p.wynik) {
      lower = {
        key: `reveal-${p.haslo}`,
        label: p.wynik.stanowisko
          ? p.dogrywka
            ? `${labelForKey(names, p.wynik.stanowisko)} wygrywa dogrywkę!`
            : `+${p.wynik.punkty} pkt dla ${labelForKey(names, p.wynik.stanowisko)}`
          : 'Nikt nie zgadł',
        value: `${p.wynik.tytul} — ${p.wynik.wykonawca}`,
      }
    } else if (!p && game.runda2?.odpada) {
      const out = game.runda2.odpada
      const awans = (['1', '2', '3'] as const).filter((k) => k !== out)
      lower = {
        key: `wyniki-r2-${out}`,
        label: 'Do rundy 3 przechodzą',
        value: awans.map((k) => labelForKey(names, k)).join(' i '),
      }
    }
  } else if (buzzes[0]) {
    lower = { key: `test-${buzzes[0].stanowisko}`, label: 'Zgłasza się', value: stationLabel(names, buzzes[0].stanowisko) }
  }

  return (
    <div className="stream">
      <IntroOverlay czolowka={game.czolowka} />
      <div className="stream__bug">
        Jaka to <span className="accent">melodia?</span>
      </div>
      {lower && (
        <div className="stream__lower" key={lower.key}>
          <span className="stream__lower-label">{lower.label}</span>
          <span className="stream__lower-value">{lower.value}</span>
        </div>
      )}
    </div>
  )
}
