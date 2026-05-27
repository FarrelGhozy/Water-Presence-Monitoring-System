import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
          <span className="text-4xl mb-4">{'\u26A0\uFE0F'}</span>
          <h2 className="text-xl font-semibold text-gray-200 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-400 mb-6 max-w-md">
            Maaf, terjadi kesalahan yang tidak terduga. Silakan muat ulang halaman.
          </p>
          <Button onClick={() => window.location.reload()}>Muat Ulang Halaman</Button>
        </div>
      )
    }
    return this.props.children
  }
}
