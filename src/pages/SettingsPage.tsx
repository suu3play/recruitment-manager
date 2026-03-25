import { useState, useRef, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import type { AppSettings, CandidateStatus, RecruitmentType, WebhookType } from '@/types'
import {
  GRADUATE_STATUSES, MID_CAREER_STATUSES,
  DEFAULT_TEMPLATES, templateKey, DEFAULT_SUB_STATUSES,
} from '@/types'

type Tab = 'general' | 'assignees' | 'sub-statuses' | 'webhook' | 'templates'

export function SettingsPage() {
  const { settings, saveSettings } = useSettings()
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 初期値を記録し isDirty 判定に使用する
  const initialValues = useRef({
    rootDir: settings?.rootDir ?? '',
    assignees: settings?.assignees ?? [],
    subStatuses: settings?.subStatuses ?? [...DEFAULT_SUB_STATUSES],
    webhookUrl: settings?.webhookUrl ?? '',
    webhookType: settings?.webhookType ?? null,
    templates: (() => {
      const savedTemplates = settings?.messageTemplates ?? {}
      const merged: Record<string, string> = { ...DEFAULT_TEMPLATES }
      for (const [k, v] of Object.entries(savedTemplates)) merged[k] = v
      return merged
    })(),
  })

  // general
  const [rootDir, setRootDir] = useState(settings?.rootDir ?? '')

  // assignees
  const [assignees, setAssignees] = useState<string[]>(settings?.assignees ?? [])
  const [newAssignee, setNewAssignee] = useState('')

  // sub-statuses
  const [subStatuses, setSubStatuses] = useState<string[]>(
    settings?.subStatuses ?? [...DEFAULT_SUB_STATUSES]
  )
  const [newSubStatus, setNewSubStatus] = useState('')

  // webhook
  const [webhookUrl, setWebhookUrl] = useState(settings?.webhookUrl ?? '')
  const [webhookType, setWebhookType] = useState<WebhookType | null>(settings?.webhookType ?? null)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  // templates
  const allStatuses = [...new Set([...GRADUATE_STATUSES, ...MID_CAREER_STATUSES])]
  const savedTemplates = settings?.messageTemplates ?? {}
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const merged: Record<string, string> = { ...DEFAULT_TEMPLATES }
    for (const [k, v] of Object.entries(savedTemplates)) merged[k] = v
    return merged
  })
  const [editingKey, setEditingKey] = useState<string | null>(null)

  // settings が null から値にロードされたとき、各 state を同期する
  useEffect(() => {
    if (!settings) return
    setRootDir(settings.rootDir ?? '')
    setAssignees(settings.assignees ?? [])
    setSubStatuses(settings.subStatuses ?? [...DEFAULT_SUB_STATUSES])
    setWebhookUrl(settings.webhookUrl ?? '')
    setWebhookType(settings.webhookType ?? null)
    const merged: Record<string, string> = { ...DEFAULT_TEMPLATES }
    for (const [k, v] of Object.entries(settings.messageTemplates ?? {})) merged[k] = v
    setTemplates(merged)
    initialValues.current = {
      rootDir: settings.rootDir ?? '',
      assignees: settings.assignees ?? [],
      subStatuses: settings.subStatuses ?? [...DEFAULT_SUB_STATUSES],
      webhookUrl: settings.webhookUrl ?? '',
      webhookType: settings.webhookType ?? null,
      templates: merged,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!settings])

  // 未保存変更の検出
  const isDirty = useMemo(() => {
    const iv = initialValues.current
    if (rootDir !== iv.rootDir) return true
    if (webhookUrl !== iv.webhookUrl) return true
    if (webhookType !== iv.webhookType) return true
    if (assignees.length !== iv.assignees.length || assignees.some((a, i) => a !== iv.assignees[i])) return true
    if (subStatuses.length !== iv.subStatuses.length || subStatuses.some((s, i) => s !== iv.subStatuses[i])) return true
    const templateKeys = Object.keys({ ...iv.templates, ...templates })
    if (templateKeys.some(k => templates[k] !== iv.templates[k])) return true
    return false
  }, [rootDir, webhookUrl, webhookType, assignees, subStatuses, templates])

  // ページ離脱時の警告（ブラウザ標準のダイアログ）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function detectWebhookType(url: string): WebhookType | null {
    if (url.includes('webhook.office.com') || url.includes('teams.microsoft.com')) return 'teams'
    if (url.includes('hooks.slack.com')) return 'slack'
    return null
  }

  function handleWebhookUrlChange(url: string) {
    setWebhookUrl(url)
    setWebhookType(detectWebhookType(url))
    setTestStatus('idle')
  }

  function handleWebhookTypeChange(type: WebhookType | null) {
    setWebhookType(type)
    setTestStatus('idle')
  }

  async function handleTestWebhook() {
    if (!webhookUrl || !webhookType) return
    setTestStatus('sending')
    try {
      await window.electronAPI.postWebhook(webhookUrl, webhookType, '【テスト】採用管理ツールからの接続確認です。')
      setTestStatus('ok')
    } catch {
      setTestStatus('error')
    }
  }

  function addListItem(
    value: string,
    list: string[],
    setList: Dispatch<SetStateAction<string[]>>,
    setValue: Dispatch<SetStateAction<string>>,
  ) {
    const trimmed = value.trim()
    if (!trimmed || list.includes(trimmed)) return
    setList(prev => [...prev, trimmed])
    setValue('')
  }

  function addAssignee() {
    addListItem(newAssignee, assignees, setAssignees, setNewAssignee)
  }

  function removeAssignee(name: string) {
    setAssignees(prev => prev.filter(a => a !== name))
  }

  function moveAssignee(index: number, direction: 'up' | 'down') {
    setAssignees(prev => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function addSubStatus() {
    addListItem(newSubStatus, subStatuses, setSubStatuses, setNewSubStatus)
  }

  function removeSubStatus(s: string) {
    setSubStatuses(prev => prev.filter(x => x !== s))
  }

  function moveSubStatus(index: number, direction: 'up' | 'down') {
    setSubStatuses(prev => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function updateTemplate(key: string, value: string) {
    setTemplates(prev => ({ ...prev, [key]: value }))
  }

  function resetTemplate(key: string) {
    setTemplates(prev => ({ ...prev, [key]: DEFAULT_TEMPLATES[key] ?? '' }))
  }

  async function handleSelectDir() {
    const dir = await window.electronAPI.selectDirectory()
    if (dir) setRootDir(dir)
  }

  async function handleSave() {
    if (isSaving) return
    const newSettings: AppSettings = {
      rootDir,
      initialized: !!rootDir,
      assignees,
      subStatuses,
      webhookUrl,
      webhookType: webhookType ?? detectWebhookType(webhookUrl),
      messageTemplates: templates,
    }
    setIsSaving(true)
    try {
      setSaveError(null)
      await saveSettings(newSettings)
      // 保存成功時は初期値を更新して isDirty をリセットする
      initialValues.current = { rootDir, assignees, subStatuses, webhookUrl, webhookType, templates }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '設定の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: '基本' },
    { key: 'assignees', label: '担当者' },
    { key: 'sub-statuses', label: 'サブステータス' },
    { key: 'webhook', label: '通知' },
    { key: 'templates', label: 'テンプレート' },
  ]

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-bold mb-5 text-gray-800">設定</h2>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setEditingKey(null) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* 基本タブ */}
        {tab === 'general' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">採用管理フォルダ</h3>
            <p className="text-xs text-gray-500">候補者データ・書類を保存するルートフォルダ。</p>
            <div className="flex gap-2">
              <input
                type="text" value={rootDir} readOnly
                placeholder="フォルダが選択されていません"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
              />
              <button onClick={handleSelectDir}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm font-medium">
                参照
              </button>
            </div>
            {rootDir && (
              <button onClick={() => window.electronAPI.openFolder(rootDir)}
                className="text-xs text-blue-600 hover:underline">
                エクスプローラーで開く
              </button>
            )}
          </div>
        )}

        {/* 担当者タブ */}
        {tab === 'assignees' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">担当者リスト</h3>
            <p className="text-xs text-gray-500 mb-3">候補者登録時に選択できる担当者を登録します。</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text" value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAssignee())}
                placeholder="担当者名"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={addAssignee}
                disabled={!newAssignee.trim() || assignees.includes(newAssignee.trim())}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-40">
                追加
              </button>
            </div>
            {assignees.length === 0
              ? <p className="text-xs text-gray-400">担当者が登録されていません</p>
              : (
                <ul className="space-y-1">
                  {assignees.map((a, i) => (
                    <li key={a} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-sm">
                      <span>{a}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveAssignee(i, 'up')}
                          disabled={i === 0}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1 disabled:opacity-30"
                          title="上へ"
                        >↑</button>
                        <button
                          onClick={() => moveAssignee(i, 'down')}
                          disabled={i === assignees.length - 1}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1 disabled:opacity-30"
                          title="下へ"
                        >↓</button>
                        <button onClick={() => removeAssignee(a)} className="text-gray-400 hover:text-red-500 text-xs ml-1">削除</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        )}

        {/* サブステータスタブ */}
        {tab === 'sub-statuses' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">サブステータスリスト</h3>
            <p className="text-xs text-gray-500 mb-3">
              全ステータス共通で使えるサブステータスを管理します。↑↓ボタンで順番を変更できます。
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text" value={newSubStatus}
                onChange={e => setNewSubStatus(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubStatus())}
                placeholder="サブステータス名"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={addSubStatus}
                disabled={!newSubStatus.trim() || subStatuses.includes(newSubStatus.trim())}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-40">
                追加
              </button>
            </div>
            {subStatuses.length === 0
              ? <p className="text-xs text-gray-400">サブステータスが登録されていません</p>
              : (
                <ul className="space-y-1">
                  {subStatuses.map((s, i) => (
                    <li key={s} className="flex items-center justify-between px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-md text-sm">
                      <span className="text-amber-800">{s}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSubStatus(i, 'up')}
                          disabled={i === 0}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1 disabled:opacity-30"
                          title="上へ"
                        >↑</button>
                        <button
                          onClick={() => moveSubStatus(i, 'down')}
                          disabled={i === subStatuses.length - 1}
                          className="text-gray-400 hover:text-gray-600 text-xs px-1 disabled:opacity-30"
                          title="下へ"
                        >↓</button>
                        <button onClick={() => removeSubStatus(s)} className="text-gray-400 hover:text-red-500 text-xs ml-1">削除</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        )}

        {/* 通知タブ */}
        {tab === 'webhook' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Incoming Webhook URL</h3>
              <p className="text-xs text-gray-500 mb-2">
                Teams または Slack の Incoming Webhook URL を入力してください。URLから自動判別します。
              </p>
              <input
                type="url" value={webhookUrl}
                onChange={e => handleWebhookUrlChange(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              {webhookUrl && (
                <p className="mt-1 text-xs text-gray-500">
                  種別: <span className="font-medium text-gray-700">{webhookType ?? '不明（TeamsまたはSlackのURLを入力してください）'}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestWebhook}
                disabled={!webhookUrl || !webhookType || testStatus === 'sending'}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm font-medium disabled:opacity-40"
              >
                {testStatus === 'sending' ? '送信中...' : '接続テスト'}
              </button>
              {testStatus === 'ok' && <span className="text-xs text-green-600 font-medium">送信成功</span>}
              {testStatus === 'error' && <span className="text-xs text-red-500 font-medium">送信失敗。URLを確認してください</span>}
            </div>
          </div>
        )}

        {/* テンプレートタブ */}
        {tab === 'templates' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              使用できる変数: <code className="bg-gray-100 px-1 rounded">{'{{名前}}'}</code>
              <code className="bg-gray-100 px-1 rounded ml-1">{'{{媒体}}'}</code>
              <code className="bg-gray-100 px-1 rounded ml-1">{'{{担当者}}'}</code>
              <code className="bg-gray-100 px-1 rounded ml-1">{'{{ステータス}}'}</code>
              <code className="bg-gray-100 px-1 rounded ml-1">{'{{応募日}}'}</code>
              <code className="bg-gray-100 px-1 rounded ml-1">{'{{期限}}'}</code>
            </p>

            {(['graduate', 'mid-career'] as RecruitmentType[]).map(type => {
              const statuses = type === 'graduate' ? GRADUATE_STATUSES : MID_CAREER_STATUSES
              return (
                <div key={type} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-sm font-semibold text-gray-700">
                      {type === 'graduate' ? '新卒' : '中途'}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {statuses.map(status => {
                      const key = templateKey(type, status)
                      const isEditing = editingKey === key
                      return (
                        <div key={key} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-600">{status}</span>
                            <div className="flex gap-2">
                              {isEditing && (
                                <button onClick={() => resetTemplate(key)}
                                  className="text-xs text-gray-400 hover:text-gray-600">デフォルトに戻す</button>
                              )}
                              <button
                                onClick={() => setEditingKey(isEditing ? null : key)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {isEditing ? '折り畳む' : '編集'}
                              </button>
                            </div>
                          </div>
                          {isEditing ? (
                            <textarea
                              value={templates[key] ?? ''}
                              onChange={e => updateTemplate(key, e.target.value)}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <p className="text-xs text-gray-500 whitespace-pre-wrap line-clamp-2">
                              {templates[key] ?? DEFAULT_TEMPLATES[key] ?? '（テンプレートなし）'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {saveError && (
          <p className="text-xs text-red-500">{saveError}</p>
        )}
        <button
          onClick={handleSave}
          disabled={!rootDir || isSaving}
          className={`w-full py-2 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-40 ${
            isDirty
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSaving ? '保存中...' : saved ? '保存しました' : isDirty ? '● 未保存の変更あり - 保存' : '保存'}
        </button>
      </div>
    </div>
  )
}
