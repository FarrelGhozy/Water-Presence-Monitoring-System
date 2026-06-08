import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/layout/Navbar'
import { Footer } from './components/layout/Footer'
import { PageContainer } from './components/layout/PageContainer'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Result from './pages/Result'
import MapPage from './pages/Map'
import NotFound from './pages/NotFound'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <div className="min-h-screen bg-surface-dark flex flex-col">
            <Navbar />
            <PageContainer>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/submit" element={<Submit />} />
                <Route path="/result/:id" element={<Result />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageContainer>
            <Footer />
          </div>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
