import type { ReactNode } from 'react'
import { FitText } from '../FitText'

export type RowState = 'idle' | 'active' | 'done' | 'missed' | 'skipped'

export interface ShowRow {
  key: string | number
  /** Lewa plakietka: wartość (100, 200…), na żywo rośnie / maleje. */
  value: ReactNode
  /** Napis na belce: wykonawca (runda 1), hasło (runda 2), wykonawca / numer zagadki (runda 3). */
  label: ReactNode
  /** Odsłonięty tytuł (po prawej stronie belki). */
  reveal?: string
  /** Kto zdobył punkty, np. „4BT · +160”. */
  by?: string
  state: RowState
}

/**
 * Lista haseł w stylu teleturnieju: plakietka z punktami + świecąca belka.
 * Aktywne hasło świeci, pozostałe przygasają; odgadnięte odsłaniają tytuł.
 */
export function ShowRows({ rows, dimOthers }: { rows: ShowRow[]; dimOthers?: boolean }) {
  const many = rows.length > 5
  return (
    <ol className={`show-rows ${many ? 'show-rows--many' : ''} ${rows.length <= 3 ? 'show-rows--few' : ''}`}>
      {rows.map((r, i) => (
        <li
          key={r.key}
          className={`show-row is-${r.state} ${dimOthers && r.state !== 'active' ? 'is-dim' : ''}`}
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="show-row__value">{r.value}</span>
          <span className="show-row__bar">
            <span className="show-row__label">
              <FitText className="show-row__label-text" boxClassName="fit-box--left" max={[2.5, 50]} min={14} widthRatio={1}>
                {r.label}
              </FitText>
            </span>
            <span className="show-row__reveal">
              {r.reveal ? (
                <>
                  <FitText className="show-row__title" boxClassName="fit-box--right" max={[1.5, 30]} min={11} widthRatio={1}>
                    {r.reveal}
                  </FitText>
                  {r.by && <span className="show-row__by">{r.by}</span>}
                </>
              ) : (
                <span className="show-row__glow" aria-hidden />
              )}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
