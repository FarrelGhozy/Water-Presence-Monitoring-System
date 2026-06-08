import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <span className="text-6xl mb-4 block">404</span>
      <h2 className="text-xl font-semibold text-gray-200 mb-2">Halaman tidak ditemukan</h2>
      <p className="text-gray-400 mb-6">Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
      <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
    </div>
  )
}
