// Shared arrow/Home/End/Escape semantics for the keyboard-navigable charts.
// `undefined` means "not a navigation key, leave the event alone".
export function nextIndexFromKey(
  key: string,
  active: number | null,
  count: number,
): number | null | undefined {
  if (count === 0) return undefined
  switch (key) {
    case 'ArrowRight':
      return Math.min(count - 1, (active ?? -1) + 1)
    case 'ArrowLeft':
      return Math.max(0, (active ?? count) - 1)
    case 'Home':
      return 0
    case 'End':
      return count - 1
    case 'Escape':
      return null
    default:
      return undefined
  }
}
