import { useRefrenPlayer } from '../../lib/game/useRefrenPlayer'

/** Przycisk „Refren” po odsłonięciu — tylko gdy w bazie zapisano sekundę refrenu. */
export function RefrenButton({ url, sec }: { url?: string; sec?: number }) {
  const refren = useRefrenPlayer()
  if (!url || sec === undefined || sec === null) return null
  return (
    <button
      type="button"
      className={`btn ${refren.playing ? 'btn--danger' : 'btn--ghost'}`}
      onClick={() => (refren.playing ? refren.stop() : refren.play(url, sec).catch(() => {}))}
    >
      {refren.playing ? '■ Zatrzymaj refren' : '♫ Refren'}
    </button>
  )
}
