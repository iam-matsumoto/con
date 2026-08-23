import { getSupabaseConfig } from './supabaseConfig'
import { getAccessToken } from './authCloud'

type ScheduleColor = 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'gray' | 'red'

export type ExternalContractor = { companyName: string; people: number }

export type CloudSchedule = {
  id: number
  date: string
  title: string
  employeeIds: string[]
  externalContractors: ExternalContractor[]
  place: string
  color: ScheduleColor
}

type ScheduleRow = {
  id: number
  schedule_date: string
  title: string
  profile_ids: string[] | null
  external_contractors: ExternalContractor[] | null
  place: string
  color: ScheduleColor
}

const request = async (path: string, init: RequestInit = {}) => {
  const config = getSupabaseConfig()
  if (!config.configured) throw new Error('Supabaseの接続情報が設定されていません。')
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: config.publishableKey, Authorization: `Bearer ${getAccessToken() ?? config.publishableKey}`, 'Content-Type': 'application/json', ...((init.headers as Record<string, string> | undefined) ?? {}) },
  })
  if (!response.ok) { const detail = await response.text(); throw new Error(`Supabaseエラー（HTTP ${response.status}）${detail ? `: ${detail}` : ''}`) }
  if (response.status === 204) return null
  const text = await response.text(); return text ? JSON.parse(text) : null
}

const toSchedule = (row: ScheduleRow): CloudSchedule => ({
  id: Number(row.id), date: row.schedule_date, title: row.title,
  employeeIds: Array.isArray(row.profile_ids) ? row.profile_ids : [],
  externalContractors: Array.isArray(row.external_contractors) ? row.external_contractors : [],
  place: row.place, color: row.color,
})
const toRow = (schedule: CloudSchedule) => ({ id: schedule.id, schedule_date: schedule.date, title: schedule.title, profile_ids: schedule.employeeIds, external_contractors: schedule.externalContractors ?? [], place: schedule.place, color: schedule.color })
const fields = 'id,schedule_date,title,profile_ids,external_contractors,place,color'
export const fetchCloudSchedules = async (): Promise<CloudSchedule[]> => ((await request(`schedules?select=${fields}&order=schedule_date.asc,id.asc`)) as ScheduleRow[]).map(toSchedule)
export const createCloudSchedule = async (schedule: Omit<CloudSchedule, 'id'>): Promise<CloudSchedule> => {
  const rows = await request(`schedules?select=${fields}`, { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify({ schedule_date:schedule.date,title:schedule.title,profile_ids:schedule.employeeIds,external_contractors:schedule.externalContractors ?? [],place:schedule.place,color:schedule.color }) }) as ScheduleRow[]
  if(!rows[0]) throw new Error('予定の登録結果を取得できませんでした。'); return toSchedule(rows[0])
}
export const updateCloudSchedule = async (schedule: CloudSchedule): Promise<CloudSchedule> => {
  const rows = await request(`schedules?id=eq.${schedule.id}&select=${fields}`, { method:'PATCH', headers:{Prefer:'return=representation'}, body:JSON.stringify({ schedule_date:schedule.date,title:schedule.title,profile_ids:schedule.employeeIds,external_contractors:schedule.externalContractors ?? [],place:schedule.place,color:schedule.color,updated_at:new Date().toISOString() }) }) as ScheduleRow[]
  if(!rows[0]) throw new Error('更新対象の予定が見つかりませんでした。'); return toSchedule(rows[0])
}
export const deleteCloudSchedule = async (id:number) => { await request(`schedules?id=eq.${id}`,{method:'DELETE'}) }
export const uploadSchedulesToCloud = async (schedules:CloudSchedule[]) => { if(schedules.length) await request('schedules?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(schedules.map(toRow))}) }
