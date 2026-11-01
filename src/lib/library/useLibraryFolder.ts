import { useCallback, useEffect, useState } from 'react'
import { scanLibrary, type ScanResult } from './library'

interface Loaded {
  scan: ScanResult<File>
  urls: Map<File, string>
}

/**
 * Wczytany folder z muzyką (tylko w pamięci tej karty przeglądarki).
 * `urlFor` daje adres blob: dla pliku — tworzony raz, zwalniany przy zmianie folderu.
 */
export function useLibraryFolder() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const urls = loaded?.urls

  useEffect(() => () => urls?.forEach((u) => URL.revokeObjectURL(u)), [urls])

  const urlFor = useCallback(
    (f: File) => {
      if (!urls) return URL.createObjectURL(f)
      let u = urls.get(f)
      if (!u) {
        u = URL.createObjectURL(f)
        urls.set(f, u)
      }
      return u
    },
    [urls],
  )

  const load = useCallback((files: FileList | File[]) => {
    const scan = scanLibrary(Array.from(files))
    setLoaded({ scan, urls: new Map() })
    return scan
  }, [])

  return { scan: loaded?.scan ?? null, load, urlFor }
}
