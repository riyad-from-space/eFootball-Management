'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

function calcTimeLeft(scheduledAt: string): TimeLeft {
  const diff = new Date(scheduledAt).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

interface CountdownTimerProps {
  scheduledAt: string
  compact?: boolean
}

export default function CountdownTimer({ scheduledAt, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(scheduledAt))

  useEffect(() => {
    if (timeLeft.total <= 0) return
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(scheduledAt))
    }, 1000)
    return () => clearInterval(interval)
  }, [scheduledAt, timeLeft.total])

  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-1.5 text-brand-secondary">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider">Match Starting</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-dark-muted text-xs font-bold tabular-nums">
        <Clock className="h-3 w-3 text-brand-accent shrink-0" />
        {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
        <span>
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    )
  }

  const segments = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
    { label: 'Secs', value: timeLeft.seconds },
  ]

  return (
    <div className="flex items-center gap-1.5">
      {segments.map((seg, i) => (
        <div key={seg.label} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <div className="bg-black/60 border border-dark-border rounded-md px-2.5 py-1.5 min-w-[42px] text-center">
              <span className="text-brand-accent font-black text-lg tabular-nums leading-none">
                {String(seg.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xxs text-dark-muted font-bold uppercase tracking-widest mt-1">
              {seg.label}
            </span>
          </div>
          {i < segments.length - 1 && (
            <span className="text-dark-muted font-black text-lg pb-4">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
