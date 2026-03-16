import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCandidates } from '@/contexts/CandidateContext'
import { useSettings } from '@/contexts/SettingsContext'
import type { RecruitmentType, CandidateStatus, RecruitmentSource, FileCategory } from '@/types'
import {
  GRADUATE_STATUSES, MID_CAREER_STATUSES,
  GRADUATE_SOURCES, MID_CAREER_SOURCES,
  FILE_CATEGORIES, detectFileCategory,
} from '@/types'

interface DroppedFile {
  name: string
  path: string
  category: FileCategory | null
}

function parseSchoolDept(raw: string): { school: string; department: string } {
  const match = raw.match(/^(.+?)(?:[/／]|\s{2,})(.+)$/)
  if (match) return { school: match[1].trim(), department: match[2].trim() }
  return { school: raw.trim(), department: '' }
}

function weekLater(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function CandidateFormPage() {
  const navigate = useNavigate()
  const { addCandidate, addFile } = useCandidates()
  const { settings, saveSettings } = useSettings()
  const registeredAssignees = settings?.assignees ?? []

  const [type, setType] = useState<RecruitmentType>('graduate')
  const [name, setName] = useState('')
  const [schoolRaw, setSchoolRaw] = useState('')
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear() + 1))
  const [source, setSource] = useState<RecruitmentSource>('マイナビ')
  const [status, setStatus] = useState<CandidateStatus>('応募')
  const [applicationDate, setApplicationDate] = useState(today())
  const [deadline, setDeadline] = useState(() => type === 'mid-career' ? weekLater() : '')
  const [nextActionDate, setNextActionDate] = useState('')
  const [assignee, setAssignee] = useState('')
  const [showRegisterAssignee, setShowRegisterAssignee] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [showContact, setShowContact] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sources = type === 'graduate' ? GRADUATE_SOURCES : MID_CAREER_SOURCES
  const statuses = type === 'graduate' ? GRADUATE_STATUSES : MID_CAREER_STATUSES
  const parsedSchool = parseSchoolDept(schoolRaw)
  const showSplit = schoolRaw.includes('/') || schoolRaw.includes('／') || /\s{2,}/.test(schoolRaw)
  const assigneeIsNew = assignee.trim() !== '' && !registeredAssignees.includes(assignee.trim())
  const allCategorized = droppedFiles.every(f => f.category !== null)

  function handleTypeChange(newType: RecruitmentType) {
    setType(newType)
    setSource(newType === 'graduate' ? 'マイナビ' : 'Green')
    setStatus('応募')
    setDeadline(newType === 'mid-career' ? weekLater() : '')
  }

  function handleAssigneeChange(value: string) {
    setAssignee(value)
    setShowRegisterAssignee(false)
  }

  async function registerAssignee() {
    const name = assignee.trim()
    if (!name || registeredAssignees.includes(name)) return
    await saveSettings({
      ...settings!,
      assignees: [...registeredAssignees, name],
    })
    setShowRegisterAssignee(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
      .filter(f => /\.(pdf|xlsx|xls|docx|doc)$/i.test(f.name))
    setDroppedFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [
        ...prev,
        ...files
          .filter(f => !existing.has(f.name))
          .map(f => ({
            name: f.name,
            path: (f as File & { path: string }).path,
            category: detectFileCategory(f.name),
          }))
      ]
    })
  }

  function updateCategory(fileName: string, category: FileCategory) {
    setDroppedFiles(prev => prev.map(f => f.name === fileName ? { ...f, category } : f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!settings?.initialized || !allCategorized) return
    setIsSubmitting(true)
    const { school, department } = parseSchoolDept(schoolRaw)
    try {
      const candidate = await addCandidate({
        name, email, phone, school, department, type,
        graduationYear: type === 'graduate' ? graduationYear : null,
        source, status, applicationDate,
        deadline: deadline || null,
        nextActionDate: nextActionDate || null,
        assignee,
      })
      for (const f of droppedFiles) {
        await addFile(candidate.id, f.path, f.name, f.category!)
      }
      navigate(`/candidates/${candidate.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-xl font-bold mb-6 text-gray-800">候補者追加</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本情報 + 採用情報 横並び */}
        <div className="grid grid-cols-2 gap-4 items-start">

          {/* 基本情報 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">基本情報</h3>

            <div className="flex items-end gap-4">
              <FieldGroup label="採用区分" required>
                <div className="flex gap-3 mt-1">
                  {(['graduate', 'mid-career'] as RecruitmentType[]).map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" checked={type === t} onChange={() => handleTypeChange(t)} className="accent-blue-600" />
                      <span className="text-sm">{t === 'graduate' ? '新卒' : '中途'}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>
              {type === 'graduate' && (
                <FieldGroup label="卒業予定年度" required>
                  <Input type="number" value={graduationYear} onChange={e => setGraduationYear(e.target.value)} min={2024} max={2035} className="w-24" />
                </FieldGroup>
              )}
            </div>

            <FieldGroup label="氏名" required>
              <Input value={name} onChange={e => setName(e.target.value)} required />
            </FieldGroup>

            <FieldGroup label="学校・学部" hint="「大学名/学部名」または「大学名　学部名」（スペース2つ）で自動分割">
              <Input
                value={schoolRaw}
                onChange={e => setSchoolRaw(e.target.value)}
                placeholder="例: ○○大学/○○学部"
              />
              {showSplit && (
                <div className="mt-1.5 flex gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 rounded px-1.5 py-0.5">{parsedSchool.school || '—'}</span>
                  <span className="text-gray-400">/</span>
                  <span className="bg-gray-100 rounded px-1.5 py-0.5">{parsedSchool.department || '—'}</span>
                </div>
              )}
            </FieldGroup>

            {/* 連絡先（折り畳み） */}
            <div>
              <button type="button" onClick={() => setShowContact(v => !v)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                <span className={`transition-transform inline-block ${showContact ? 'rotate-90' : ''}`}>▶</span>
                連絡先情報
              </button>
              {showContact && (
                <div className="mt-3 space-y-3 pl-3 border-l-2 border-gray-100">
                  <FieldGroup label="メールアドレス">
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="電話番号">
                    <Input value={phone} onChange={e => setPhone(e.target.value)} />
                  </FieldGroup>
                </div>
              )}
            </div>
          </div>

          {/* 採用情報 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100">採用情報</h3>

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="採用媒体" required>
                <select value={source} onChange={e => setSource(e.target.value as RecruitmentSource)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FieldGroup>
              <FieldGroup label="初期ステータス" required>
                <select value={status} onChange={e => setStatus(e.target.value as CandidateStatus)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FieldGroup>
            </div>

            <FieldGroup label="応募日" required>
              <Input type="date" value={applicationDate} onChange={e => setApplicationDate(e.target.value)} />
            </FieldGroup>

            {/* 担当者（コンボボックス） */}
            <FieldGroup label="担当者">
              <input
                list="assignee-list"
                value={assignee}
                onChange={e => handleAssigneeChange(e.target.value)}
                onBlur={() => assigneeIsNew && setShowRegisterAssignee(true)}
                placeholder="名前を入力または選択"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="assignee-list">
                {registeredAssignees.map(a => <option key={a} value={a} />)}
              </datalist>
              {showRegisterAssignee && assigneeIsNew && (
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-gray-500">「{assignee}」は未登録です。</span>
                  <button type="button" onClick={registerAssignee} className="text-blue-600 hover:underline font-medium">
                    設定に登録
                  </button>
                </div>
              )}
            </FieldGroup>

            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label={type === 'mid-career' ? '期限（デフォルト1週間）' : '期限'}>
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </FieldGroup>
              <FieldGroup label="次アクション日">
                <Input type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
              </FieldGroup>
            </div>
          </div>
        </div>

        {/* 添付資料 */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-100 mb-4">添付資料</h3>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg transition-colors ${
              isDragging ? 'border-blue-400 bg-blue-50' : droppedFiles.length > 0 ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
            }`}
          >
            {/* ドロップ中オーバーレイ */}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-50/80 z-10 pointer-events-none">
                <p className="text-blue-600 font-medium text-sm">ここにドロップ</p>
              </div>
            )}

            {droppedFiles.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-500">PDF・Excel ファイルをここにドラッグ&ドロップ</p>
                <p className="text-xs text-gray-400 mt-1">.pdf .xlsx .xls .docx .doc</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {droppedFiles.map(f => (
                  <div key={f.name} className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-md">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 truncate block">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.category !== null
                        ? <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{f.category}</span>
                        : <span className="text-xs text-orange-500 font-medium">要選択</span>
                      }
                      <select
                        value={f.category ?? ''}
                        onChange={e => updateCategory(f.name, e.target.value as FileCategory)}
                        className={`text-xs px-2 py-1 border rounded ${f.category === null ? 'border-orange-400 text-orange-600' : 'border-gray-300 text-gray-600'}`}
                      >
                        <option value="" disabled>種別</option>
                        {FILE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={() => setDroppedFiles(p => p.filter(x => x.name !== f.name))} className="text-gray-400 hover:text-red-500 text-xs">
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                {/* ドロップ追加エリア（ファイルがある場合も継続可能） */}
                <div className={`mt-1 p-2 text-center rounded border border-dashed text-xs text-gray-400 ${isDragging ? 'border-blue-400' : 'border-gray-200'}`}>
                  さらにドロップで追加
                </div>
              </div>
            )}
          </div>

          {!allCategorized && (
            <p className="text-xs text-orange-500 mt-2">未判定のファイルの種別を選択してください</p>
          )}
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name || !allCategorized}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '登録中...' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FieldGroup({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className ?? ''}`}
    />
  )
}
