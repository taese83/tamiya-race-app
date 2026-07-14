import axios from 'axios'
import type {RacesResponse, RaceDetailResponse} from '../model/types'

export const RACES_QUERY_KEY = ['races'] as const
export const raceDetailQueryKey = (wrId: string) => ['race-detail', wrId] as const

// 로컬: vite.config proxy가 /api/* → localhost:3001 로 전달
// Vercel: 같은 도메인의 /api/* Serverless Functions로 직접 전달
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function fetchRaces(signal?: AbortSignal): Promise<RacesResponse> {
  const res = await axios.get<RacesResponse>(`${API_BASE}/api/races`, {signal})
  return res.data
}

export async function fetchRaceDetail(wrId: string, signal?: AbortSignal): Promise<RaceDetailResponse> {
  const res = await axios.get<RaceDetailResponse>(`${API_BASE}/api/races/${wrId}/detail`, {signal})
  return res.data
}

export async function refreshRaces(): Promise<RacesResponse> {
  const res = await axios.post<RacesResponse>(`${API_BASE}/api/races/refresh`)
  return res.data
}
