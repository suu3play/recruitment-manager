import { Component, useEffect, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import { CandidateProvider } from './contexts/CandidateContext'
import { Sidebar } from './components/layout/Sidebar'
import { CandidateListPage } from './pages/CandidateListPage'
import { CandidateFormPage } from './pages/CandidateFormPage'
import { CandidateDetailPage } from './pages/CandidateDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // エラーは getDerivedStateFromError で捕捉済み
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full space-y-4 text-center">
            <p className="text-sm font-medium text-red-600">予期しないエラーが発生しました</p>
            <p className="text-xs text-gray-500 break-all">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppRoutes() {
  const { settings, isLoading } = useSettings()
  const prevInitialized = useRef<boolean | undefined>(undefined)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    // SetupPage 完了直後（initialized が false→true に変わった瞬間）に
    // CandidateProvider のマウントが完了するまで 1 フレーム待つ
    if (prevInitialized.current === false && settings?.initialized === true) {
      setIsTransitioning(true)
      const id = requestAnimationFrame(() => setIsTransitioning(false))
      return () => cancelAnimationFrame(id)
    }
    prevInitialized.current = settings?.initialized
  }, [settings?.initialized])

  if (isLoading || isTransitioning) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    )
  }

  // 未初期化（初回起動）はセットアップ画面のみ表示
  if (!settings?.initialized) {
    return <SetupPage />
  }

  return (
    <CandidateProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<CandidateListPage />} />
            <Route path="/candidates/new" element={<CandidateFormPage />} />
            <Route path="/candidates/:id" element={<CandidateDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </CandidateProvider>
  )
}

export default function App() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark)
    }

    apply(mq.matches)
    mq.addEventListener('change', e => apply(e.matches))

    return () => {
      mq.removeEventListener('change', e => apply(e.matches))
    }
  }, [])

  // Electron 環境外（ブラウザ直接アクセス等）での明示的なエラー表示
  if (!window.electronAPI) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center space-y-2">
          <p className="text-sm font-medium text-gray-700">このアプリは Electron 環境でのみ動作します</p>
          <p className="text-xs text-gray-400">デスクトップアプリとして起動してください</p>
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <ErrorBoundary>
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </ErrorBoundary>
    </HashRouter>
  )
}
