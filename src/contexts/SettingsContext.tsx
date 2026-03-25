import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppSettings } from '@/types'
import { DEFAULT_SUB_STATUSES } from '@/types'

interface SettingsContextValue {
  settings: AppSettings | null
  isLoading: boolean
  isError: boolean
  errorMessage: string | null
  saveSettings: (settings: AppSettings) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const settingsPath = await window.electronAPI.getSettingsPath()
      const data = await window.electronAPI.readJson<AppSettings>(settingsPath)
      setSettings(data ?? { rootDir: '', initialized: false, assignees: [], subStatuses: [...DEFAULT_SUB_STATUSES], webhookUrl: '', webhookType: null, messageTemplates: {} })
    } catch (e) {
      setIsError(true)
      setErrorMessage(e instanceof Error ? e.message : '設定の読み込みに失敗しました')
      setSettings({ rootDir: '', initialized: false, assignees: [], subStatuses: [...DEFAULT_SUB_STATUSES], webhookUrl: '', webhookType: null, messageTemplates: {} })
    } finally {
      setIsLoading(false)
    }
  }

  async function saveSettings(newSettings: AppSettings) {
    const settingsPath = await window.electronAPI.getSettingsPath()
    await window.electronAPI.writeJson(settingsPath, newSettings)
    setSettings(newSettings)
  }

  return (
    <SettingsContext.Provider value={{ settings, isLoading, isError, errorMessage, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
