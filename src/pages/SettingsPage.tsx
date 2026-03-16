import { useState } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import type { AppSettings } from '@/types'

export function SettingsPage() {
  const { settings, saveSettings } = useSettings()
  const [rootDir, setRootDir] = useState(settings?.rootDir ?? '')
  const [assignees, setAssignees] = useState<string[]>(settings?.assignees ?? [])
  const [newAssignee, setNewAssignee] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSelectDir() {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) setRootDir(dir)
  }

  function addAssignee() {
    const name = newAssignee.trim()
    if (!name || assignees.includes(name)) return
    setAssignees(prev => [...prev, name])
    setNewAssignee('')
  }

  function removeAssignee(name: string) {
    setAssignees(prev => prev.filter(a => a !== name))
  }

  async function handleSave() {
    const newSettings: AppSettings = {
      rootDir,
      initialized: !!rootDir,
      assignees,
    }
    await saveSettings(newSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-xl space-y-5">
      <h2 className="text-xl font-bold text-gray-800">設定</h2>

      {/* 採用管理フォルダ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">採用管理フォルダ</h3>
        <p className="text-xs text-gray-500 mb-3">
          候補者のデータ・書類を保存するルートフォルダを指定してください。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={rootDir}
            readOnly
            placeholder="フォルダが選択されていません"
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
          <button
            onClick={() => window.electronAPI.openFolder(rootDir)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            エクスプローラーで開く
          </button>
        )}
      </div>

      {/* 担当者管理 */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">担当者</h3>
        <p className="text-xs text-gray-500 mb-3">
          候補者登録時に選択できる担当者を登録します。フォームで直接入力することも可能です。
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newAssignee}
            onChange={e => setNewAssignee(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAssignee())}
            placeholder="担当者名を入力"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={addAssignee}
            disabled={!newAssignee.trim() || assignees.includes(newAssignee.trim())}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            追加
          </button>
        </div>

        {assignees.length === 0 ? (
          <p className="text-xs text-gray-400">担当者が登録されていません</p>
        ) : (
          <ul className="space-y-1">
            {assignees.map(a => (
              <li key={a} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-sm">
                <span className="text-gray-700">{a}</span>
                <button
                  onClick={() => removeAssignee(a)}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!rootDir}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saved ? '保存しました' : '保存'}
      </button>
    </div>
  )
}
