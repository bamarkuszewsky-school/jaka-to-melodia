import { useEffect, useState } from 'react'

const W = 1920
const H = 1080

/** Dopasowuje scenę 1920×1080 do okna (tablica, iPad, OBS). */
export function useFitScale(): number {
  const read = () => Math.min(window.innerWidth / W, window.innerHeight / H)
  const [scale, setScale] = useState(read)
  useEffect(() => {
    const onResize = () => setScale(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}
