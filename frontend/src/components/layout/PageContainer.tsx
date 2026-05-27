import type { ReactNode } from 'react'

export function PageContainer({ children }: { children: ReactNode }) {
  return <main className="min-h-screen pt-14">{children}</main>
}
