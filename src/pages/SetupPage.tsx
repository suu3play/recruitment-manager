import { useState } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import type { AppSettings } from '@/types'
import { DEFAULT_SUB_STATUSES } from '@/types'

export function SetupPage() {
  const { saveSettings } = useSettings()
  const [rootDir, setRootDir] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSelectDir() {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) setRootDir(dir)
  }

  async function handleStart() {
    if (!rootDir) return
    setIsSaving(true)
    setSaveError(null)
    const settings: AppSettings = {
      rootDir,
      initialized: true,
      assignees: [],
      subStatuses: [...DEFAULT_SUB_STATUSES],
      webhookUrl: '',
      webhookType: null,
      messageTemplates: {},
    }
    try {
      await saveSettings(settings)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '設定の保存に失敗しました')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">採用管理</h1>
          <p className="mt-2 text-sm text-gray-500">
            はじめに、候補者データと書類を保存するフォルダを指定してください。
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            採用管理フォルダ <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rootDir}
              readOnly
              placeholder="フォルダを選択してください"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-700"
            />
            <button
              onClick={handleSelectDir}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              参照
            </button>
          </div>
          {rootDir && (
            <p className="text-xs text-gray-400 break-all">{rootDir}</p>
          )}
        </div>

        {saveError && (
          <p className="text-xs text-red-500">{saveError}</p>
        )}
        <button
          onClick={handleStart}
          disabled={!rootDir || isSaving}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? '設定中...' : '開始する'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          設定はあとから「設定」画面で変更できます。
        </p>
      </div>
    </div>
  )
}
