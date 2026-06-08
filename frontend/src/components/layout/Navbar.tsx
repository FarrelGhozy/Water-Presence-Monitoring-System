import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'

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
        <Link to="/" className="flex items-center gap-2 text-brand-500 font-bold text-lg">
          <Icon name="water" className="text-brand-400" />
          Water Presence
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
