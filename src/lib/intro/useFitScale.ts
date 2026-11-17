import { useEffect, useState } from 'react'

const W = 1920
const H = 1080

/** Dopasowuje scenę 1920×1080 do okna (tablica, iPad, OBS). `reserveTop` — miejsce na pasek u góry. */
export function useFitScale(reserveTop = 0): number {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return Math.min(size.w / W, (size.h - reserveTop) / H)
}
