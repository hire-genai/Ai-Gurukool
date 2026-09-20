'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SurveyModal from '@/components/SurveyModal'

export default function SurveyPage() {
  const [open, setOpen] = useState(true)
  const router = useRouter()

  // Handle browser back button — if user presses Back while on /survey, close modal
  useEffect(() => {
    const onPopState = () => setOpen(false)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleClose = () => {
    setOpen(false)
    // Go back if there's history, else go home
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <>
      {/* Minimal page content shown under modal */}
      <div style={{ minHeight: '100vh', background: '#07111f' }} />
      <SurveyModal isOpen={open} onClose={handleClose} />
    </>
  )
}
