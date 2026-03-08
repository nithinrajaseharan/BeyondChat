import { useEffect } from 'react'

export function useKeyboardNav(threads, selectedId, onSelect) {
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 'j') {
        e.preventDefault()
        const idx = threads.findIndex(t => t.id === selectedId)
        const next = threads[idx + 1] || (selectedId === null && threads[0])
        if (next) onSelect(next.id)
      } else if (e.key === 'k') {
        e.preventDefault()
        const idx = threads.findIndex(t => t.id === selectedId)
        const prev = threads[idx - 1]
        if (prev) onSelect(prev.id)
      } else if (e.key === 'Escape') {
        if (selectedId) { e.preventDefault(); onSelect(null) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [threads, selectedId, onSelect])
}
