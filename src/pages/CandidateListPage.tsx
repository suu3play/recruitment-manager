import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCandidates } from '@/contexts/CandidateContext'
import { useSettings } from '@/contexts/SettingsContext'
import { StatusBadge, SubStatusBadge, TypeBadge } from '@/components/common/Badge'
import type { CandidateStatus, RecruitmentType, RecruitmentSource } from '@/types'
import {
  GRADUATE_STATUSES, MID_CAREER_STATUSES,
  GRADUATE_SOURCES, MID_CAREER_SOURCES
} from '@/types'

type SortKey = 'name' | 'status' | 'deadline' | 'createdAt'
type SortDir = 'asc' | 'desc'

export function CandidateListPage() {
  const { candidates, isLoading } = useCandidates()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeFilter = (searchParams.get('type') ?? 'all') as RecruitmentType | 'all'
  const statusFilter = (searchParams.get('status') ?? 'all') as CandidateStatus | 'all'
  const sourceFilter = (searchParams.get('source') ?? 'all') as RecruitmentSource | 'all'
  const yearFilter = searchParams.get('year') ?? 'all'
  const search = searchParams.get('q') ?? ''
  const sortKey = (searchParams.get('sortKey') ?? 'createdAt') as SortKey
  const sortDir = (searchParams.get('sortDir') ?? 'desc') as SortDir

  function updateParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === 'all' || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      return next
    }, { replace: true })
  }

  function setTypeFilter(v: RecruitmentType | 'all') { updateParam('type', v) }
  function setStatusFilter(v: CandidateStatus | 'all') { updateParam('status', v) }
  function setSourceFilter(v: RecruitmentSource | 'all') { updateParam('source', v) }
  function setYearFilter(v: string) { updateParam('year', v) }
  function setSearch(v: string) { updateParam('q', v) }

  const hasActiveFilter = typeFilter !== 'all' || statusFilter !== 'all' || sourceFilter !== 'all' || yearFilter !== 'all' || search !== ''

  function resetFilters() {
    setSearchParams({}, { replace: true })
  }

  const allStatuses = useMemo(
    () => [...new Set([...GRADUATE_STATUSES, ...MID_CAREER_STATUSES])],
    []
  )
  const allSources = useMemo(
    () => [...new Set([...GRADUATE_SOURCES, ...MID_CAREER_SOURCES])],
    []
  )
  const years = useMemo(
    () => [...new Set(candidates.filter(c => c.graduationYear).map(c => c.graduationYear!))]
      .sort((a, b) => Number(a) - Number(b)),
    [candidates]
  )

  const filtered = useMemo(() => {
    let list = [...candidates]
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter)
    if (statusFilter !== 'all') list = list.filter(c => c.status === statusFilter)
    if (sourceFilter !== 'all') list = list.filter(c => c.source === sourceFilter)
    if (yearFilter !== 'all') list = list.filter(c => c.graduationYear === yearFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase() ?? '').includes(q) ||
        (c.assignee?.toLowerCase() ?? '').includes(q)
      )
    }
    list.sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      const cmp = String(va).localeCompare(String(vb), 'ja')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [candidates, typeFilter, statusFilter, sourceFilter, yearFilter, search, sortKey, sortDir])

  function exportCSV() {
    const headers = ['氏名', '採用区分', 'ステータス', '採用媒体', '担当者', '応募日', '期限']
    const typeLabel = (type: string) => type === 'graduate' ? '新卒' : type === 'mid-career' ? '中途' : type
    const rows = filtered.map(c => [
      c.name,
      typeLabel(c.type),
      c.status,
      c.source ?? '',
      c.assignee ?? '',
      c.createdAt ? c.createdAt.slice(0, 10) : '',
      c.deadline ? c.deadline.slice(0, 10) : '',
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidates_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleSort(key: SortKey) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (sortKey === key) {
        next.set('sortDir', sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        next.set('sortKey', key)
        next.set('sortDir', 'asc')
      }
      return next
    }, { replace: true })
  }

  function deadlineClass(deadline: string | null) {
    if (!deadline) return ''
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    if (days < 0) return 'text-red-600 font-semibold'
    if (days <= 3) return 'text-orange-500 font-semibold'
    return 'text-gray-600'
  }

  const now = Date.now()
  const expiredCount = filtered.filter(c => c.deadline && new Date(c.deadline).getTime() < now).length
  const nearDeadlineCount = filtered.filter(c => {
    if (!c.deadline) return false
    const days = Math.ceil((new Date(c.deadline).getTime() - now) / 86400000)
    return days >= 0 && days <= 3
  }).length

  if (!settings?.initialized) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">まず設定画面で保存先フォルダを設定してください。</p>
        <button onClick={() => navigate('/settings')} className="text-blue-600 hover:underline text-sm">
          設定へ移動
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">
            候補者一覧 <span className="text-sm font-normal text-gray-500">({filtered.length}件)</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-colors"
            >
              CSVエクスポート
            </button>
            <button
              onClick={() => navigate('/candidates/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              + 候補者追加
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="氏名・メール・担当者で検索"
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-52"
          />
          <Select aria-label="採用区分フィルター" value={typeFilter} onChange={v => setTypeFilter(v as RecruitmentType | 'all')}>
            <option value="all">区分: 全て</option>
            <option value="graduate">新卒</option>
            <option value="mid-career">中途</option>
          </Select>
          <Select aria-label="ステータスフィルター" value={statusFilter} onChange={v => setStatusFilter(v as CandidateStatus | 'all')}>
            <option value="all">ステータス: 全て</option>
            {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select aria-label="採用媒体フィルター" value={sourceFilter} onChange={v => setSourceFilter(v as RecruitmentSource | 'all')}>
            <option value="all">媒体: 全て</option>
            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
          {years.length > 0 && (
            <Select aria-label="卒業年度フィルター" value={yearFilter} onChange={v => setYearFilter(v)}>
              <option value="all">卒業年度: 全て</option>
              {years.map(y => <option key={y} value={y}>{y}年卒</option>)}
            </Select>
          )}
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md transition-colors"
            >
              リセット
            </button>
          )}
        </div>
      </div>

      {/* 期限警告バナー */}
      {(expiredCount > 0 || nearDeadlineCount > 0) && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-center gap-3">
          <span className="font-medium">期限アラート:</span>
          {expiredCount > 0 && <span>期限切れ: <strong>{expiredCount}件</strong></span>}
          {nearDeadlineCount > 0 && <span>直近3日以内: <strong>{nearDeadlineCount}件</strong></span>}
        </div>
      )}

      {/* テーブル */}
      <div className="flex-1 overflow-auto mt-3">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">候補者が見つかりません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
              <tr>
                <Th onClick={() => toggleSort('name')} sortKey="name" currentSort={sortKey} dir={sortDir}>氏名</Th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">区分</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">媒体</th>
                <Th onClick={() => toggleSort('status')} sortKey="status" currentSort={sortKey} dir={sortDir}>ステータス</Th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">担当者</th>
                <Th onClick={() => toggleSort('deadline')} sortKey="deadline" currentSort={sortKey} dir={sortDir}>期限</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/candidates/${c.id}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/candidates/${c.id}`) }}
                  tabIndex={0}
                  role="row"
                  aria-label={`${c.name} の詳細を開く`}
                  className="hover:bg-blue-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <TypeBadge type={c.type} />
                    {c.graduationYear && (
                      <span className="ml-1 text-xs text-gray-400">{c.graduationYear}年卒</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={c.status} size="sm" />
                      {c.subStatus && <SubStatusBadge subStatus={c.subStatus} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.assignee || '—'}</td>
                  <td className={`px-4 py-3 ${deadlineClass(c.deadline)}`}>
                    {c.deadline ? formatDate(c.deadline) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Select({ value, onChange, children, 'aria-label': ariaLabel }: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  'aria-label'?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
    >
      {children}
    </select>
  )
}

function Th({ children, onClick, sortKey, currentSort, dir }: {
  children: React.ReactNode
  onClick: () => void
  sortKey: string
  currentSort: string
  dir: SortDir
}) {
  const active = sortKey === currentSort
  return (
    <th
      onClick={onClick}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
    >
      {children}
      {active && <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
