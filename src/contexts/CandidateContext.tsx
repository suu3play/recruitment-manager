import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Candidate, CandidateStatus, StageRecord, FileCategory } from '@/types'
import { buildCandidateFolderPath, moveCandidateFolder, getProfileJsonPath } from '@/utils/folderStructure'
import { useSettings } from './SettingsContext'

interface CandidateContextValue {
  candidates: Candidate[]
  isLoading: boolean
  addCandidate: (data: Omit<Candidate, 'id' | 'folderPath' | 'createdAt' | 'updatedAt' | 'stages' | 'files'>) => Promise<Candidate>
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<void>
  changeStatus: (id: string, newStatus: CandidateStatus, stageRecord: Omit<StageRecord, 'stage'>) => Promise<void>
  updateSubStatus: (id: string, subStatus: string | null) => Promise<void>
  deleteCandidate: (id: string) => Promise<void>
  addFile: (candidateId: string, srcPath: string, fileName: string, category: FileCategory) => Promise<void>
  removeFile: (candidateId: string, fileName: string) => Promise<void>
  reload: () => Promise<void>
}

const CandidateContext = createContext<CandidateContextValue | null>(null)

export function CandidateProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!settings?.initialized || !settings.rootDir) return
    setIsLoading(true)
    const loaded = await scanCandidates(settings.rootDir)
    setCandidates(loaded)
    setIsLoading(false)
  }, [settings])

  useEffect(() => {
    reload()
  }, [reload])

  async function saveCandidateProfile(candidate: Candidate) {
    const profilePath = getProfileJsonPath(candidate.folderPath)
    await window.electronAPI.writeJson(profilePath, candidate)
  }

  async function addCandidate(data: Omit<Candidate, 'id' | 'folderPath' | 'createdAt' | 'updatedAt' | 'stages' | 'files'>): Promise<Candidate> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const folderPath = buildCandidateFolderPath(
      settings!.rootDir,
      data.type,
      data.status,
      data.name,
      id,
      data.graduationYear
    )
    const candidate: Candidate = {
      ...data,
      id,
      folderPath,
      subStatus: data.subStatus ?? null,
      stages: [],
      files: [],
      createdAt: now,
      updatedAt: now,
    }
    await window.electronAPI.ensureDir(folderPath)
    await saveCandidateProfile(candidate)
    setCandidates(prev => [...prev, candidate])
    return candidate
  }

  async function updateCandidate(id: string, updates: Partial<Candidate>) {
    const now = new Date().toISOString()
    setCandidates(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: now } : c)
      const updated = next.find(c => c.id === id)
      if (updated) saveCandidateProfile(updated)
      return next
    })
  }

  async function changeStatus(id: string, newStatus: CandidateStatus, stageData: Omit<StageRecord, 'stage'>) {
    const candidate = candidates.find(c => c.id === id)
    if (!candidate) return

    const newFolderPath = await moveCandidateFolder(candidate, settings!.rootDir, newStatus)
    const stageRecord: StageRecord = { ...stageData, stage: newStatus }
    const now = new Date().toISOString()
    const updated: Candidate = {
      ...candidate,
      status: newStatus,
      subStatus: stageData.subStatus ?? null,  // ステータス変更時にサブステータスも更新
      folderPath: newFolderPath,
      stages: [...candidate.stages, stageRecord],
      updatedAt: now,
    }
    await saveCandidateProfile(updated)
    setCandidates(prev => prev.map(c => c.id === id ? updated : c))
  }

  async function updateSubStatus(id: string, subStatus: string | null) {
    await updateCandidate(id, { subStatus })
  }

  async function deleteCandidate(id: string) {
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  async function addFile(candidateId: string, srcPath: string, fileName: string, category: FileCategory) {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) return
    const destPath = `${candidate.folderPath}/${fileName}`
    await window.electronAPI.copyFile(srcPath, destPath)
    await updateCandidate(candidateId, {
      files: [...candidate.files, { name: fileName, path: destPath, category }]
    })
  }

  async function removeFile(candidateId: string, fileName: string) {
    const candidate = candidates.find(c => c.id === candidateId)
    if (!candidate) return
    const file = candidate.files.find(f => f.name === fileName)
    if (file) await window.electronAPI.deleteFile(file.path)
    await updateCandidate(candidateId, {
      files: candidate.files.filter(f => f.name !== fileName)
    })
  }

  return (
    <CandidateContext.Provider value={{
      candidates, isLoading, addCandidate, updateCandidate,
      changeStatus, updateSubStatus, deleteCandidate, addFile, removeFile, reload
    }}>
      {children}
    </CandidateContext.Provider>
  )
}

export function useCandidates() {
  const ctx = useContext(CandidateContext)
  if (!ctx) throw new Error('useCandidates must be used within CandidateProvider')
  return ctx
}

// ルートディレクトリを再帰的にスキャンして候補者を読み込む
async function scanCandidates(rootDir: string): Promise<Candidate[]> {
  const results: Candidate[] = []
  const typeKeys = ['新卒', '中途']

  for (const typeKey of typeKeys) {
    const typeDir = `${rootDir}/${typeKey}`
    const exists = await window.electronAPI.exists(typeDir)
    if (!exists) continue

    if (typeKey === '新卒') {
      const yearDirs = await window.electronAPI.listFiles(typeDir)
      for (const yearDir of yearDirs) {
        await scanStatusDirs(`${typeDir}/${yearDir}`, results)
      }
    } else {
      await scanStatusDirs(typeDir, results)
    }
  }
  return results
}

async function scanStatusDirs(statusParentDir: string, results: Candidate[]) {
  const statusDirs = await window.electronAPI.listFiles(statusParentDir)
  for (const statusDir of statusDirs) {
    const statusDirPath = `${statusParentDir}/${statusDir}`
    const candidateDirs = await window.electronAPI.listFiles(statusDirPath)
    for (const candidateDir of candidateDirs) {
      const profilePath = `${statusDirPath}/${candidateDir}/profile.json`
      const profile = await window.electronAPI.readJson<Candidate>(profilePath)
      if (profile) results.push(profile)
    }
  }
}
