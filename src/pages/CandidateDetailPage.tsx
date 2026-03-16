import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCandidates } from '@/contexts/CandidateContext'
import { useSettings } from '@/contexts/SettingsContext'
import { StatusBadge, TypeBadge } from '@/components/common/Badge'
import type { CandidateStatus, Rating, StageRecord, FileCategory } from '@/types'
import {
  GRADUATE_STATUSES, MID_CAREER_STATUSES, RATING_COLORS,
  FILE_CATEGORIES, detectFileCategory,
} from '@/types'

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { candidates, changeStatus, addFile, removeFile, deleteCandidate, updateCandidate } = useCandidates()
  const { settings } = useSettings()
  const candidate = candidates.find(c => c.id === id)
  const registeredAssignees = settings?.assignees ?? []

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  if (!candidate) {
    return <div className="p-8 text-gray-400">候補者が見つかりません</div>
  }

  const statuses = candidate.type === 'graduate' ? GRADUATE_STATUSES : MID_CAREER_STATUSES

  async function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
      .filter(f => /\.(pdf|xlsx|xls|docx|doc)$/i.test(f.name))
    for (const file of files) {
      const path = (file as File & { path: string }).path
      const category: FileCategory = detectFileCategory(file.name) ?? 'その他'
      await addFile(candidate!.id, path, file.name, category)
    }
  }

  async function handleDelete() {
    if (!confirm(`「${candidate!.name}」を削除しますか？`)) return
    await deleteCandidate(candidate!.id)
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-sm">← 一覧</button>
          <h2 className="text-lg font-bold text-gray-800">{candidate.name}</h2>
          <TypeBadge type={candidate.type} />
          {candidate.graduationYear && (
            <span className="text-sm text-gray-400">{candidate.graduationYear}年卒</span>
          )}
          <StatusBadge status={candidate.status} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.electronAPI.openFolder(candidate.folderPath)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            フォルダを開く
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            ステータス変更
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
          >
            削除
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-3 gap-6">
        {/* 基本情報 */}
        <div className="col-span-1 space-y-4">
          <InfoCard title="基本情報">
            <InfoRow label="媒体" value={candidate.source} />
            <InfoRow label="応募日" value={candidate.applicationDate ? formatDate(candidate.applicationDate) : '—'} />
            {(candidate.school || candidate.department) && (
              <InfoRow label="学校" value={[candidate.school, candidate.department].filter(Boolean).join(' / ')} />
            )}
            <InfoRow label="担当者" value={candidate.assignee || '未設定'} />
            {candidate.email && <InfoRow label="メール" value={candidate.email} />}
            {candidate.phone && <InfoRow label="電話" value={candidate.phone} />}
            <InfoRow
              label="期限"
              value={candidate.deadline ? formatDate(candidate.deadline) : '—'}
              className={deadlineClass(candidate.deadline)}
            />
            <InfoRow
              label="次アクション"
              value={candidate.nextActionDate ? formatDate(candidate.nextActionDate) : '—'}
              className={deadlineClass(candidate.nextActionDate)}
            />
          </InfoCard>

          {/* 選考ステップ */}
          <InfoCard title="選考ステップ">
            <div className="space-y-1">
              {statuses.map((s, i) => {
                const done = candidate.stages.some(st => st.stage === s)
                const isCurrent = candidate.status === s
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                      done ? 'bg-blue-600 text-white' :
                      isCurrent ? 'bg-blue-100 border-2 border-blue-500 text-blue-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${isCurrent ? 'font-semibold text-blue-700' : done ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                      {s}
                    </span>
                  </div>
                )
              })}
            </div>
          </InfoCard>
        </div>

        {/* 選考履歴 */}
        <div className="col-span-2 space-y-4">
          <InfoCard title="選考履歴 & メモ">
            {candidate.stages.length === 0 ? (
              <p className="text-sm text-gray-400">選考履歴はありません</p>
            ) : (
              <div className="space-y-3">
                {[...candidate.stages].reverse().map((stage, i) => (
                  <StageCard key={i} stage={stage} />
                ))}
              </div>
            )}
          </InfoCard>

          {/* 書類 */}
          <InfoCard title="書類">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-lg p-4 mb-3 text-center text-sm transition-colors ${
                isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span className="text-gray-400">ここにファイルをドロップ</span>
            </div>

            {candidate.files.length === 0 ? (
              <p className="text-sm text-gray-400">書類が登録されていません</p>
            ) : (
              <ul className="space-y-1.5">
                {candidate.files.map(f => (
                  <li key={f.name} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded shrink-0">
                      {f.category ?? 'その他'}
                    </span>
                    <button
                      onClick={() => window.electronAPI.openFile(f.path)}
                      className="text-sm text-blue-600 hover:underline truncate flex-1 text-left"
                    >
                      {f.name}
                    </button>
                    <button
                      onClick={() => removeFile(candidate!.id, f.name)}
                      className="text-xs text-gray-400 hover:text-red-500 shrink-0"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>
        </div>
      </div>

      {/* ステータス変更モーダル */}
      {showStatusModal && (
        <StatusChangeModal
          candidate={candidate}
          statuses={statuses}
          registeredAssignees={registeredAssignees}
          onClose={() => setShowStatusModal(false)}
          onSubmit={async (newStatus, record) => {
            await changeStatus(candidate.id, newStatus, record)
            setShowStatusModal(false)
          }}
        />
      )}
    </div>
  )
}

function StageCard({ stage }: { stage: StageRecord }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <StatusBadge status={stage.stage} size="sm" />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {stage.rating && (
            <span className={`font-bold ${RATING_COLORS[stage.rating]}`}>{stage.rating}</span>
          )}
          {stage.evaluator && <span>{stage.evaluator}</span>}
          <span>{formatDate(stage.date)}</span>
        </div>
      </div>
      {stage.memo && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{stage.memo}</p>}
    </div>
  )
}

function weekLater(from?: string): string {
  const d = from ? new Date(from) : new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

function StatusChangeModal({ candidate, statuses, registeredAssignees, onClose, onSubmit }: {
  candidate: { status: CandidateStatus; type: string; assignee: string }
  statuses: CandidateStatus[]
  registeredAssignees: string[]
  onClose: () => void
  onSubmit: (status: CandidateStatus, record: Omit<StageRecord, 'stage'>) => Promise<void>
}) {
  const today = new Date().toISOString().split('T')[0]
  const isMidCareer = candidate.type === 'mid-career'

  const [newStatus, setNewStatus] = useState<CandidateStatus>(candidate.status)
  const [date, setDate] = useState(today)
  const [evaluator, setEvaluator] = useState(candidate.assignee)
  const [deadline, setDeadline] = useState(isMidCareer ? weekLater() : '')
  const [rating, setRating] = useState<Rating | ''>('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    setIsLoading(true)
    await onSubmit(newStatus, { date, evaluator, rating: rating || null, memo, deadline: deadline || null } as Omit<StageRecord, 'stage'>)
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[480px] space-y-4">
        <h3 className="text-base font-bold text-gray-800">ステータス変更</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">新しいステータス</label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as CandidateStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
            <input
              list="modal-assignee-list"
              value={evaluator}
              onChange={e => setEvaluator(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <datalist id="modal-assignee-list">
              {registeredAssignees.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">評価</label>
            <select value={rating} onChange={e => setRating(e.target.value as Rating | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">—</option>
              {(['S', 'A', 'B', 'C', 'D'] as Rating[]).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {isMidCareer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              次回期限 <span className="text-xs text-gray-400">（中途：デフォルト1週間）</span>
            </label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-40"
          >
            {isLoading ? '更新中...' : '更新'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between py-1 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-800 ${className ?? ''}`}>{value}</span>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function deadlineClass(deadline: string | null): string {
  if (!deadline) return ''
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'text-red-600'
  if (days <= 3) return 'text-orange-500'
  return ''
}
