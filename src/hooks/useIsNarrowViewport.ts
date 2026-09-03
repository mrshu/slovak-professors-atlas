import { useEffect, useState } from 'react'

export const NARROW_MEDIA_QUERY = '(max-width: 600px)'

/**
 * Phone-width flag for the charts whose geometry cannot be expressed in CSS:
 * the map thins its labels, the scatter widens its viewBox for bigger type.
 */
export default function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia(NARROW_MEDIA_QUERY)
    const update = () => setIsNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isNarrow
}
