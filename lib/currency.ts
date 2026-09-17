'use client'
import { useEffect, useState } from 'react'

export type Currency = 'INR' | 'USD'

const USD_PER_INR = 0.01

function detectCurrency(): Currency {
  if (typeof window === 'undefined') return 'INR'
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'INR'
    const langs: string[] = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language || '',
    ]
    if (langs.some(l => /(-|_)IN\b/i.test(l))) return 'INR'
    return 'USD'
  } catch {
    return 'INR'
  }
}

export function useCurrency(): Currency {
  const [cur, setCur] = useState<Currency>('INR')
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const lang = navigator.language
    const override = localStorage.getItem('aig_currency_override') as Currency | null
    const detected = override ?? detectCurrency()
    console.log('[Currency]', { timezone: tz, language: lang, override, detected })
    setCur(detected)
  }, [])
  return cur
}

function formatUsd(usd: number): string {
  const abs = Math.abs(usd)
  if (abs >= 1000) {
    const k = usd / 1000
    const rounded = Math.round(k * 10) / 10
    return `$${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}K`
  }
  if (abs >= 1 && usd % 1 === 0) return `$${usd}`
  if (abs >= 1) return `$${usd.toFixed(0)}`
  return `$${usd.toFixed(2)}`
}

export function convertLabel(label: string, currency: Currency): string {
  if (!label || currency === 'INR') return label
  return label.replace(/₹\s*([\d,]+(?:\.\d+)?)\s*([KLkl])?/g, (_m, num: string, mag?: string) => {
    let n = parseFloat(num.replace(/,/g, ''))
    if (!isFinite(n)) return _m
    const m = (mag || '').toUpperCase()
    if (m === 'K') n *= 1000
    else if (m === 'L') n *= 100000
    return formatUsd(n * USD_PER_INR)
  })
}
