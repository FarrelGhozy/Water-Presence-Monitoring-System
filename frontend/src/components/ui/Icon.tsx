const icons = {
  water: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 2C12 2 7 8 7 13c0 2.8 2.2 5 5 5s5-2.2 5-5c0-5-5-11-5-11z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="3" y="10" width="4" height="11" rx="1" />
      <rect x="10" y="6" width="4" height="15" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M10.3 4.4L2.1 18c-.6 1 .1 2.2 1.2 2.2h17.4c1.1 0 1.8-1.3 1.2-2.2L13.7 4.4c-.6-1-2-1-2.6 0z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  ),
  satellite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M13 2L4.7 10.3c-.4.4-.4 1 0 1.4l7.6 7.6c.4.4 1 .4 1.4 0L22 13" />
      <path d="M15 6l3 3" />
      <circle cx="18" cy="10" r="3" />
      <circle cx="6" cy="18" r="3" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  rain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3a7 7 0 0 0-13.4 2A4 4 0 0 0 4 17h16" />
      <line x1="8" y1="19" x2="8" y2="21" />
      <line x1="12" y1="19" x2="12" y2="21" />
      <line x1="16" y1="19" x2="16" y2="21" />
    </svg>
  ),
  soil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M2 22h20" />
      <path d="M12 2v6" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 14h16" />
      <path d="M4 18h16" />
    </svg>
  ),
  mountain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M8 3l4 8 5-5 5 15H2L8 3z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.7" y2="16.7" />
    </svg>
  ),
  lightbulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.1 14.7a6 6 0 1 0-6.2 0C10.5 16.5 11 17.5 11 18h2c0-.5.5-1.5 2.1-3.3z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="10" r="3" />
      <path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z" />
    </svg>
  ),
} as const

type IconName = keyof typeof icons

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      {icons[name]}
    </span>
  )
}
