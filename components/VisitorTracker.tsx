'use client'
import { useEffect } from 'react'

export default function VisitorTracker({ onCount }: { onCount?: (n: number) => void } = {}) {
  useEffect(() => {
    const KEY = 'aig_vid'
    let vid = localStorage.getItem(KEY)
    if (!vid) {
      vid = (crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2))
      localStorage.setItem(KEY, vid)
    }
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid }),
    })
      .then(r => r.json())
      .then(d => {
        if (typeof d?.count === 'number') {
          window.dispatchEvent(new CustomEvent('aig-visitor-count', { detail: d.count }))
          onCount?.(d.count)
        }
      })
      .catch(() => {})
  }, [onCount])
  return null
}
