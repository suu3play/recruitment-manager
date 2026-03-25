import type { CandidateStatus } from '@/types'
import { STATUS_COLORS } from '@/types'

interface Props {
  status: CandidateStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const color = STATUS_COLORS[status]
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${color} ${sizeClass}`}>
      {status}
    </span>
  )
}

interface TypeBadgeProps {
  type: 'graduate' | 'mid-career'
}

export function SubStatusBadge({ subStatus }: { subStatus: string }) {
  if (!subStatus) return null
  return (
    <span className="inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium bg-amber-50 text-amber-700 border border-amber-200">
      {subStatus}
    </span>
  )
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium ${
      type === 'graduate' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
    }`}>
      {type === 'graduate' ? '新卒' : '中途'}
    </span>
  )
}
