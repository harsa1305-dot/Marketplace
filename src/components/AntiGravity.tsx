'use client'

import React from 'react'

interface AntiGravityProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  duration?: number // Durasi satu siklus melayang penuh (detik), default: 4
  delay?: number // Jeda waktu sebelum animasi dimulai (detik), default: 0
  distance?: number // Jarak melayang naik-turun (pixel), default: 12
  direction?: 'up-down' | 'down-up'
  hoverEffect?: boolean // Efek melambat & terangkat saat di-hover, default: true
  className?: string
}

export default function AntiGravity({
  children,
  duration = 4,
  delay = 0,
  distance = 12,
  direction = 'up-down',
  hoverEffect = true,
  className = '',
  style,
  ...props
}: AntiGravityProps) {
  const animKey = `antigravity-${Math.round(distance)}-${direction}`
  const initialOffset = direction === 'up-down' ? 0 : -distance
  const peakOffset = direction === 'up-down' ? -distance : 0

  return (
    <div
      className={`inline-block will-change-transform ${
        hoverEffect ? 'transition-transform duration-300 hover:-translate-y-1.5' : ''
      } ${className}`}
      style={{
        animation: `${animKey} ${duration}s ease-in-out ${delay}s infinite alternate`,
        ...style,
      }}
      {...props}
    >
      <style jsx global>{`
        @keyframes ${animKey} {
          0% {
            transform: translateY(${initialOffset}px);
          }
          100% {
            transform: translateY(${peakOffset}px);
          }
        }
      `}</style>
      {children}
    </div>
  )
}

