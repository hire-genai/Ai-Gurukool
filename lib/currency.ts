'use client'
import { useEffect, useState } from 'react'

export type Currency = 'INR' | 'USD'

const USD_PER_INR = 0.01  // 100 INR = $1

export function isOutsideIndia(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return false
    const langs: string[] = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language || '',
    ]
    if (langs.some(l => /(-|_)IN\b/i.test(l))) return false
    return true
  } catch {
    return false
  }
}

function detectCurrency(): Currency {
  return isOutsideIndia() ? 'USD' : 'INR'
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

function parseInr(num: string, mag?: string): number {
  const n = parseFloat(num.replace(/,/g, ''))
  if (!isFinite(n)) return 0
  const m = (mag || '').toUpperCase()
  if (m === 'K') return n * 1000
  if (m === 'L') return n * 100000
  return n
}

function formatUsd(usd: number): string {
  const rounded = Math.round(usd)
  if (rounded >= 1000) {
    const k = rounded / 1000
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return `$${rounded}`
}

export function convertLabel(label: string, currency: Currency): string {
  if (!label || currency === 'INR') return label

  // Step 1: Range with BOTH having ₹ prefix: ₹5,000 – ₹20,000 | ₹1L–₹5L
  let result = label.replace(
    /₹\s*([\d,]+(?:\.\d+)?)\s*([KLkl])?\s*[–\-]\s*₹\s*([\d,]+(?:\.\d+)?)\s*([KLkl])?/g,
    (_m, n1: string, s1: string | undefined, n2: string, s2: string | undefined) => {
      const usd1 = parseInr(n1, s1) * USD_PER_INR
      const usd2 = parseInr(n2, s2) * USD_PER_INR
      return `${formatUsd(usd1)}–${formatUsd(usd2)}`
    }
  )

  // Step 2: Range with ONE ₹ prefix, trailing suffix applies to both: ₹1–3K | ₹50K–1L
  result = result.replace(
    /₹\s*([\d,]+(?:\.\d+)?)\s*([KLkl])?\s*[–\-]\s*([\d,]+(?:\.\d+)?)\s*([KLkl])?/g,
    (_m, n1: string, s1: string | undefined, n2: string, s2: string | undefined) => {
      // If n1 has no suffix but n2 does, n1 inherits n2's suffix (₹1–3K means 1K–3K)
      const inr1 = parseInr(n1, s1 || s2)
      const inr2 = parseInr(n2, s2)
      return `${formatUsd(inr1 * USD_PER_INR)}–${formatUsd(inr2 * USD_PER_INR)}`
    }
  )

  // Step 3: Single values — <₹5K  ₹4,999  ₹50K+
  result = result.replace(
    /([<>]?\s*)₹\s*([\d,]+(?:\.\d+)?)\s*([KLkl])?([+]?)/g,
    (_m, prefix: string, num: string, mag: string | undefined, plus: string) => {
      const usd = parseInr(num, mag) * USD_PER_INR
      return `${prefix.trim()}${formatUsd(usd)}${plus}`
    }
  )

  return result
}
