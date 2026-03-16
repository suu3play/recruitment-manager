export type RecruitmentType = 'graduate' | 'mid-career'

export type GraduateSource = 'マイナビ' | 'ツノル'
export type MidCareerSource = 'Green' | 'Wantedly'
export type RecruitmentSource = GraduateSource | MidCareerSource

export type GraduateStatus =
  | '応募'
  | '書類選考'
  | '一次面接'
  | '最終面接'
  | '内定'
  | '不採用'
  | '辞退'

export type MidCareerStatus =
  | '応募'
  | 'カジュアル面談'
  | '書類選考'
  | '一次面接'
  | '最終面接'
  | '内定'
  | '不採用'
  | '辞退'

export type CandidateStatus = GraduateStatus | MidCareerStatus

export type Rating = 'S' | 'A' | 'B' | 'C' | 'D'

export interface StageRecord {
  stage: CandidateStatus
  date: string
  evaluator: string
  rating: Rating | null
  memo: string
  deadline?: string | null  // 中途：ステータス変更時の次回期限
}

export type FileCategory = '履歴書' | '職務経歴書' | '成績証明書' | '卒業見込み' | 'その他'

export const FILE_CATEGORIES: FileCategory[] = ['履歴書', '職務経歴書', '成績証明書', '卒業見込み', 'その他']

export const CATEGORY_KEYWORDS: Record<FileCategory, string[]> = {
  '履歴書': ['履歴書'],
  '職務経歴書': ['職務経歴書', '職歴'],
  '成績証明書': ['成績証明'],
  '卒業見込み': ['卒業見込み', '卒業証明'],
  'その他': [],
}

/** ファイル名からカテゴリを自動推定（判定できない場合は null）*/
export function detectFileCategory(fileName: string): FileCategory | null {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [FileCategory, string[]][]) {
    if (category === 'その他') continue
    if (keywords.some(kw => fileName.includes(kw))) return category
  }
  return null
}

export interface CandidateFile {
  name: string
  path: string
  category: FileCategory
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  school: string        // 学校名
  department: string    // 学部・学科
  type: RecruitmentType
  graduationYear: string | null  // 新卒のみ（例: "2026"）
  source: RecruitmentSource
  status: CandidateStatus
  applicationDate: string        // 応募日
  deadline: string | null        // 期限
  nextActionDate: string | null  // 次アクション日
  assignee: string               // 担当者
  stages: StageRecord[]
  files: CandidateFile[]
  folderPath: string             // 実際のフォルダパス
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  rootDir: string
  initialized: boolean
  assignees: string[]  // 登録済み担当者リスト
}

// 定数
export const GRADUATE_STATUSES: GraduateStatus[] = [
  '応募', '書類選考', '一次面接', '最終面接', '内定', '不採用', '辞退'
]

export const MID_CAREER_STATUSES: MidCareerStatus[] = [
  '応募', 'カジュアル面談', '書類選考', '一次面接', '最終面接', '内定', '不採用', '辞退'
]

export const GRADUATE_SOURCES: GraduateSource[] = ['マイナビ', 'ツノル']
export const MID_CAREER_SOURCES: MidCareerSource[] = ['Green', 'Wantedly']

export const STATUS_FOLDER_MAP: Record<CandidateStatus, string> = {
  '応募': '01_応募',
  'カジュアル面談': '02_カジュアル面談',
  '書類選考': '03_書類選考',
  '一次面接': '04_一次面接',
  '最終面接': '05_最終面接',
  '内定': '99_内定',
  '不採用': '00_不採用_辞退',
  '辞退': '00_不採用_辞退',
}

export const STATUS_COLORS: Record<CandidateStatus, string> = {
  '応募': 'bg-gray-100 text-gray-700',
  'カジュアル面談': 'bg-blue-100 text-blue-700',
  '書類選考': 'bg-yellow-100 text-yellow-700',
  '一次面接': 'bg-orange-100 text-orange-700',
  '最終面接': 'bg-purple-100 text-purple-700',
  '内定': 'bg-green-100 text-green-700',
  '不採用': 'bg-red-100 text-red-700',
  '辞退': 'bg-gray-200 text-gray-500',
}

export const RATING_COLORS: Record<Rating, string> = {
  'S': 'text-yellow-500',
  'A': 'text-green-600',
  'B': 'text-blue-600',
  'C': 'text-orange-500',
  'D': 'text-red-500',
}
