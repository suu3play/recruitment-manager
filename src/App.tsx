import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import { CandidateProvider } from './contexts/CandidateContext'
import { Sidebar } from './components/layout/Sidebar'
import { CandidateListPage } from './pages/CandidateListPage'
import { CandidateFormPage } from './pages/CandidateFormPage'
import { CandidateDetailPage } from './pages/CandidateDetailPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
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
      </SettingsProvider>
    </BrowserRouter>
  )
}
