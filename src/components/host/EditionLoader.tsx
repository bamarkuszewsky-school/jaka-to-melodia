import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { loadEdition, QuestionFileError, type LoadedEdition } from '../../lib/game/questions'

interface Props {
  edition: LoadedEdition | null
  onLoaded: (edition: LoadedEdition) => void
}

/** Wybór folderu edycji (pytania.json + MP3) z dysku MacBooka. */
export function EditionLoader({ edition, onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // React nie zna atrybutu webkitdirectory — ustawiamy go ręcznie (Safari i Chrome go obsługują).
  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '')
    inputRef.current?.setAttribute('directory', '')
  }, [])

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      onLoaded(await loadEdition(files))
    } catch (err) {
      setError(err instanceof QuestionFileError ? err.message : 'Nie udało się wczytać folderu.')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <section className="card card--wide">
      <div className="card__head">
        <div>
          <h2 className="card__title">Edycja</h2>
          <p className="muted">
            {edition
              ? `${edition.set.edycja} · runda 1: ${edition.set.runda1.length} haseł · runda 2: ${edition.set.runda2.length} · dogrywka: ${edition.set.dogrywka2.length} · runda 3: ${edition.set.runda3.length}`
              : 'Wybierz folder z plikiem pytania.json i muzyką.'}
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Wczytywanie…' : edition ? 'Wczytaj inny folder' : 'Wybierz folder'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={onChange} />
      </div>

      {error && <p className="error">{error}</p>}
      {edition && edition.missing.length > 0 && (
        <p className="error">Brakuje plików w folderze: {edition.missing.join(', ')}</p>
      )}
      {!edition && (
        <p className="muted small">
          Folder zostaje tylko na tym komputerze — odpowiedzi nie trafiają do internetu. Po odświeżeniu strony trzeba go
          wybrać ponownie (stan gry i punkty zostają).
        </p>
      )}
    </section>
  )
}
