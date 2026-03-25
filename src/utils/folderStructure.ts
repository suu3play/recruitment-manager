import type { Candidate, RecruitmentType, CandidateStatus } from '@/types'
import { STATUS_FOLDER_MAP } from '@/types'

function join(...parts: string[]): string {
  return parts
    .map((p, i) => i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, ''))
    .filter(Boolean)
    .join('/')
}

/**
 * 候補者のフォルダパスを生成する
 */
export function buildCandidateFolderPath(
  rootDir: string,
  type: RecruitmentType,
  status: CandidateStatus,
  candidateName: string,
  candidateId: string,
  graduationYear: string | null = null
): string {
  const typeDir = type === 'graduate' ? '新卒' : '中途'
  const statusDir = STATUS_FOLDER_MAP[status]
  if (statusDir === undefined) {
    throw new Error(`ステータスに対応するフォルダが定義されていません: "${status}"`)
  }
  const sanitizedName = sanitizeDirName(candidateName)
  if (!sanitizedName) {
    throw new Error(`候補者名が無効です: "${candidateName}"`)
  }
  const candidateDir = `${sanitizedName}_${candidateId.substring(0, 8)}`

  if (type === 'graduate' && graduationYear) {
    return join(rootDir, typeDir, `${graduationYear}年卒`, statusDir, candidateDir)
  }
  return join(rootDir, typeDir, statusDir, candidateDir)
}

/**
 * 候補者のフォルダを初期化（新規登録時）
 */
export async function initCandidateFolder(candidate: Candidate): Promise<void> {
  await window.electronAPI.ensureDir(candidate.folderPath)
}

/**
 * ステータス変更時にフォルダを移動する
 */
export async function moveCandidateFolder(
  candidate: Candidate,
  rootDir: string,
  newStatus: CandidateStatus
): Promise<string> {
  const newFolderPath = buildCandidateFolderPath(
    rootDir,
    candidate.type,
    newStatus,
    candidate.name,
    candidate.id,
    candidate.graduationYear
  )

  const oldExists = await window.electronAPI.exists(candidate.folderPath)
  if (oldExists && candidate.folderPath !== newFolderPath) {
    const moved = await window.electronAPI.moveDir(candidate.folderPath, newFolderPath)
    if (!moved) {
      throw new Error(
        `フォルダの移動に失敗しました: "${candidate.folderPath}" → "${newFolderPath}"`
      )
    }
  } else if (!oldExists) {
    await window.electronAPI.ensureDir(newFolderPath)
  }

  return newFolderPath
}

/**
 * ディレクトリ名に使えない文字を除去
 */
function sanitizeDirName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim()
}

/**
 * 候補者のprofile.jsonパスを返す
 */
export function getProfileJsonPath(folderPath: string): string {
  return join(folderPath, 'profile.json')
}
