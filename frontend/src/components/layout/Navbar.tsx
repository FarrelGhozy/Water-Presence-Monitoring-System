import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Beranda' },
  { to: '/submit', label: 'Observasi Baru' },
  { to: '/map', label: 'Peta' },
]

export function Navbar() {
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-dark/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-brand-500 font-bold text-lg">
          <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#22d3ee" strokeWidth="1.5" opacity="0.3" />
            <path d="M16 5C17 5 18 6 18 8v4c4 1 7 4 7 7v1h1c1 0 1 1 1 1s0 1-1 1h-1c-1 4-4 7-8 7h-1c-3 0-6-2-8-5l2-1c2-1 3-4 2-6s-4-2-6 0c0 0-1-1 0-2s3-2 5-2V8c0-2 1-3 2-3z" fill="url(#logo-grad)" />
            <circle cx="16" cy="16" r="2" fill="#22d3ee" opacity="0.8" />
            <path d="M23 11l4-3M24 14l5-1M22 20l5 2" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </svg>
          Pantau Air
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                location.pathname === link.to
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
