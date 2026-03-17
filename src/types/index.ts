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

export const DEFAULT_SUB_STATUSES = [
  '日程調整中',
  '次回選考の意思確認中',
  '結果待ち（社内検討中）',
  'オファー条件交渉中',
] as const

export interface StageRecord {
  stage: CandidateStatus
  date: string
  evaluator: string
  rating: Rating | null
  memo: string
  subStatus?: string | null  // サブステータス
  deadline?: string | null   // 中途：ステータス変更時の次回期限
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
  subStatus: string | null       // サブステータス（例: 日程調整中）
  applicationDate: string        // 応募日
  deadline: string | null        // 期限
  assignee: string               // 担当者
  stages: StageRecord[]
  files: CandidateFile[]
  folderPath: string             // 実際のフォルダパス
  createdAt: string
  updatedAt: string
}

export type WebhookType = 'teams' | 'slack'

export interface AppSettings {
  rootDir: string
  initialized: boolean
  assignees: string[]
  subStatuses: string[]          // カスタムサブステータスリスト
  webhookUrl: string           // Teams または Slack の Incoming Webhook URL
  webhookType: WebhookType | null
  messageTemplates: Record<string, string>  // key: `${type}_${status}`
}

// テンプレート変数: {{名前}} {{媒体}} {{担当者}} {{ステータス}} {{応募日}} {{期限}}
export type TemplateVars = {
  名前: string
  媒体: string
  担当者: string
  ステータス: string
  応募日: string
  期限: string
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    return (vars as Record<string, string>)[key.trim()] ?? `{{${key}}}`
  })
}

/** type と status から template キーを生成 */
export function templateKey(type: RecruitmentType, status: CandidateStatus): string {
  return `${type}_${status}`
}

export const DEFAULT_TEMPLATES: Record<string, string> = {
  // 新卒
  'graduate_応募':
    '【新卒応募】{{名前}}さん（{{媒体}}）が応募しました。\n担当: {{担当者}}\n応募日: {{応募日}}',
  'graduate_書類選考':
    '【書類選考】{{名前}}さんを書類選考中です。\n担当: {{担当者}}\n期限: {{期限}}',
  'graduate_一次面接':
    '【一次面接依頼】{{名前}}さんの書類選考が通過しました。\n一次面接の日程調整をお願いします。\n担当: {{担当者}}\n期限: {{期限}}',
  'graduate_最終面接':
    '【最終面接依頼】{{名前}}さんが一次面接を通過しました。\n最終面接の日程調整をお願いします。\n担当: {{担当者}}\n期限: {{期限}}',
  'graduate_内定':
    '【内定】{{名前}}さんに内定を出しました。\n担当: {{担当者}}',
  'graduate_不採用':
    '【不採用】{{名前}}さんの選考を終了しました。\n担当: {{担当者}}',
  'graduate_辞退':
    '【辞退】{{名前}}さんが辞退されました。\n担当: {{担当者}}',
  // 中途
  'mid-career_応募':
    '【中途応募】{{名前}}さん（{{媒体}}）が応募しました。\n担当: {{担当者}}\n応募日: {{応募日}}\n期限: {{期限}}',
  'mid-career_カジュアル面談':
    '【カジュアル面談】{{名前}}さんのカジュアル面談を設定してください。\n担当: {{担当者}}\n期限: {{期限}}',
  'mid-career_書類選考':
    '【書類選考】{{名前}}さんを書類選考中です。\n担当: {{担当者}}\n期限: {{期限}}',
  'mid-career_一次面接':
    '【一次面接依頼】{{名前}}さんの書類選考が通過しました。\n一次面接の日程調整をお願いします。\n担当: {{担当者}}\n期限: {{期限}}',
  'mid-career_最終面接':
    '【最終面接依頼】{{名前}}さんが一次面接を通過しました。\n最終面接の日程調整をお願いします。\n担当: {{担当者}}\n期限: {{期限}}',
  'mid-career_内定':
    '【内定】{{名前}}さんに内定を出しました。\n担当: {{担当者}}',
  'mid-career_不採用':
    '【不採用】{{名前}}さんの選考を終了しました。\n担当: {{担当者}}',
  'mid-career_辞退':
    '【辞退】{{名前}}さんが辞退されました。\n担当: {{担当者}}',
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
