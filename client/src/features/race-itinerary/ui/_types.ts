import type {RaceEntry} from '@/entities/race'

export interface ItineraryEntry {
  race: RaceEntry
  isTransfer: boolean
  availableAt: number
}

export interface ItineraryResult {
  entries: ItineraryEntry[]
  totalMoves: number
  uniqueClasses: string[]
  excludedCount: number
}

export interface ItineraryOptions {
  startVenue: string | null
  allowedCategories: string[]
}

export const DEFAULT_ITINERARY_OPTIONS: ItineraryOptions = {
  startVenue: null,
  allowedCategories: [],
}

export function parseMinutes(time: string): number {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr ?? '', 10)
  const m = parseInt(mStr ?? '', 10)
  if (isNaN(h) || isNaN(m)) return -1
  return h * 60 + m
}
