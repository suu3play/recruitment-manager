import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppSettings } from '@/types'

interface SettingsContextValue {
  settings: AppSettings | null
  isLoading: boolean
  saveSettings: (settings: AppSettings) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const settingsPath = await window.electronAPI.getSettingsPath()
    const data = await window.electronAPI.readJson<AppSettings>(settingsPath)
    setSettings(data ?? { rootDir: '', initialized: false, assignees: [] })
    setIsLoading(false)
  }

  async function saveSettings(newSettings: AppSettings) {
    const settingsPath = await window.electronAPI.getSettingsPath()
    await window.electronAPI.writeJson(settingsPath, newSettings)
    setSettings(newSettings)
  }

  return (
    <SettingsContext.Provider value={{ settings, isLoading, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
