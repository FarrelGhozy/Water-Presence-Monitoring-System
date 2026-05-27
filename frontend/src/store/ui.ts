import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  toggleSidebar: () => void
  darkMode: boolean
  toggleDarkMode: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  darkMode: localStorage.getItem('darkMode') !== 'false',
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      localStorage.setItem('darkMode', String(next))
      document.documentElement.classList.toggle('dark', next)
      return { darkMode: next }
    }),
}))
