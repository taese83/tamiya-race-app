import {useState, useEffect, useCallback} from 'react'
import type {CalendarSource, CalendarEvent, ICalSettings} from '@/entities/calendar-event'
import {CALENDAR_COLORS} from '@/entities/calendar-event'
import {parseIcal} from './icalParser'

const LS_KEY = 'tamiya-ical-settings'
const MAX_SOURCES = 5

function loadSettings(): ICalSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {sources: []}
    return JSON.parse(raw) as ICalSettings
  } catch {
    return {sources: []}
  }
}

function saveSettings(settings: ICalSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings))
  } catch {
    // quota exceeded 등 무시
  }
}

function nextColor(sources: CalendarSource[]): string {
  const used = new Set(sources.map(s => s.color))
  return CALENDAR_COLORS.find(c => !used.has(c)) ?? CALENDAR_COLORS[0]
}

async function fetchIcal(url: string): Promise<string> {
  const proxyUrl = `/api/ical-proxy?url=${encodeURIComponent(url)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error(`iCal fetch 실패: ${res.status}`)
  return res.text()
}

export function useNaverCalendar() {
  const [settings, setSettings] = useState<ICalSettings>(() => loadSettings())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // 마운트 시 저장된 모든 소스 fetch
  useEffect(() => {
    const stored = loadSettings()
    if (stored.sources.length === 0) return
    setSettings(stored)

    void (async () => {
      const allEvents: CalendarEvent[] = []
      const updated = {...stored, sources: [...stored.sources]}

      await Promise.allSettled(
        stored.sources.map(async (source, idx) => {
          try {
            const text = await fetchIcal(source.url)
            const parsed = parseIcal(text, source)
            allEvents.push(...parsed)
            updated.sources[idx] = {
              ...source,
              eventCount: parsed.length,
              lastSynced: new Date().toISOString(),
              error: undefined,
            }
          } catch (err) {
            updated.sources[idx] = {
              ...source,
              error: err instanceof Error ? err.message : '연결 실패',
            }
          }
        })
      )

      setSettings(updated)
      saveSettings(updated)
      setEvents(allEvents)
    })()
  }, [])

  /** 새 캘린더 소스 추가 */
  const addSource = useCallback(async (
    url: string,
    name?: string,
    color?: string,
  ): Promise<{success: boolean; error?: string}> => {
    const current = loadSettings()
    if (current.sources.length >= MAX_SOURCES) {
      return {success: false, error: `최대 ${MAX_SOURCES}개까지 추가할 수 있습니다`}
    }

    const id = `cal-${Date.now()}`
    const resolvedColor = color ?? nextColor(current.sources)
    const resolvedName = name?.trim() || `내 캘린더 ${current.sources.length + 1}`

    const newSource: CalendarSource = {id, name: resolvedName, color: resolvedColor, url}
    setLoadingId(id)

    try {
      const text = await fetchIcal(url)
      const parsed = parseIcal(text, newSource)

      const updated: ICalSettings = {
        sources: [
          ...current.sources,
          {...newSource, eventCount: parsed.length, lastSynced: new Date().toISOString()},
        ],
      }
      saveSettings(updated)
      setSettings(updated)
      setEvents(prev => [...prev.filter(e => e.sourceId !== id), ...parsed])
      return {success: true}
    } catch (err) {
      return {success: false, error: err instanceof Error ? err.message : '연결 실패'}
    } finally {
      setLoadingId(null)
    }
  }, [])

  /** 캘린더 소스 제거 */
  const removeSource = useCallback((id: string) => {
    const current = loadSettings()
    const updated: ICalSettings = {
      sources: current.sources.filter(s => s.id !== id),
    }
    saveSettings(updated)
    setSettings(updated)
    setEvents(prev => prev.filter(e => e.sourceId !== id))
  }, [])

  const totalEventCount = settings.sources.reduce((sum, s) => sum + (s.eventCount ?? 0), 0)
  const hasError = settings.sources.some(s => Boolean(s.error))

  return {
    sources: settings.sources,
    events,
    loadingId,
    totalEventCount,
    hasError,
    addSource,
    removeSource,
    maxSources: MAX_SOURCES,
  }
}
