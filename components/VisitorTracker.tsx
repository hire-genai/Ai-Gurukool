'use client'
import { useEffect } from 'react'

export default function VisitorTracker() {
  useEffect(() => {
    const KEY = 'aig_vid'
    let vid = localStorage.getItem(KEY)
    if (!vid) {
      vid = crypto.randomUUID()
      localStorage.setItem(KEY, vid)
    }
    // only POST on first-ever visit (no second key means already posted before)
    const posted = sessionStorage.getItem('aig_tracked')
    if (posted) return
    sessionStorage.setItem('aig_tracked', '1')
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid }),
    }).catch(() => {})
  }, [])
  return null
}
