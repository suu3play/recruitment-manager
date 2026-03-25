import { useState, useEffect } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import type { Candidate } from '@/types'
import { templateKey, renderTemplate, DEFAULT_TEMPLATES } from '@/types'

interface NotifyPanelProps {
  candidate: Candidate
  status: string // 変更後のステータス
  deadline?: string | null
  onSkip?: () => void
  onPosted?: () => void
}

export function NotifyPanel({ candidate, status, deadline, onSkip, onPosted }: NotifyPanelProps) {
  const { settings } = useSettings()
  const webhookUrl = settings?.webhookUrl ?? ''
  const webhookType = settings?.webhookType ?? null
  const templates = settings?.messageTemplates ?? {}

  const key = templateKey(candidate.type, status as any)
  const baseTemplate = templates[key] ?? DEFAULT_TEMPLATES[key] ?? ''

  const vars = {
    名前: candidate.name,
    媒体: candidate.source,
    担当者: candidate.assignee || '未設定',
    ステータス: status,
    応募日: candidate.applicationDate ?? '—',
    期限: deadline ?? candidate.deadline ?? '—',
  }

  const [message, setMessage] = useState(() => renderTemplate(baseTemplate, vars))
  const [postStatus, setPostStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  useEffect(() => {
    setMessage(renderTemplate(baseTemplate, vars))
  }, [candidate, status])
  const [errorMsg, setErrorMsg] = useState('')

  const canPost = !!webhookUrl && !!webhookType && !!window.electronAPI?.postWebhook

  async function handlePost() {
    if (!canPost) return
    setPostStatus('sending')
    setErrorMsg('')
    try {
      await window.electronAPI.postWebhook(webhookUrl, webhookType!, message)
      setPostStatus('ok')
      onPosted?.()
    } catch (e: any) {
      setPostStatus('error')
      setErrorMsg(e?.message ?? '送信に失敗しました')
    }
  }

  if (!baseTemplate) return null

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-800">
          {webhookType === 'teams' ? 'Teams' : webhookType === 'slack' ? 'Slack' : 'チャット'} に投稿
        </h4>
        {!canPost && (
          <span className="text-xs text-gray-400">Webhook URLが未設定です</span>
        )}
      </div>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={Math.max(3, message.split('\n').length + 1)}
        disabled={!canPost}
        className="w-full px-3 py-2 border border-blue-200 rounded-md text-sm font-mono bg-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />

      <div className="flex items-center gap-3">
        {canPost && (
          <button
            onClick={handlePost}
            disabled={postStatus === 'sending' || postStatus === 'ok' || !message.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-40 transition-colors"
          >
            {postStatus === 'sending' ? '送信中...' : postStatus === 'ok' ? '送信済み' : '投稿'}
          </button>
        )}
        {onSkip && postStatus !== 'ok' && (
          <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">
            スキップ
          </button>
        )}
        {postStatus === 'ok' && (
          <span className="text-xs text-green-600 font-medium">投稿しました</span>
        )}
        {postStatus === 'error' && (
          <span className="text-xs text-red-500">{errorMsg}</span>
        )}
      </div>
    </div>
  )
}
