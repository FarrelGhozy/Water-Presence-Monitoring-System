import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-xl border border-gray-800 p-4 ${className}`}>
      {children}
    </div>
  )
}
