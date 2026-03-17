import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider, useSettings } from './contexts/SettingsContext'
import { CandidateProvider } from './contexts/CandidateContext'
import { Sidebar } from './components/layout/Sidebar'
import { CandidateListPage } from './pages/CandidateListPage'
import { CandidateFormPage } from './pages/CandidateFormPage'
import { CandidateDetailPage } from './pages/CandidateDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'

function AppRoutes() {
  const { settings, isLoading } = useSettings()

  if (isLoading) {
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
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </BrowserRouter>
  )
}
