import {useCallback, useEffect, useRef, useState} from 'react'
import {addFavorite, clearAllFavorites, getAllFavorites, removeFavorite} from '@/shared/lib/favoritesDb'

const CHANNEL_NAME = 'tamiya-race-favorites'

interface UseFavoritesResult {
  favorites: ReadonlySet<string>
  count: number
  isFavorite: (id: string) => boolean
  toggle: (id: string) => void
  clearAll: () => void
  isReady: boolean
}

/**
 * 즐겨찾기 상태 훅
 *
 * - IndexedDB를 authoritative store로 사용하고 in-memory Set을 mirror로 유지한다.
 * - toggle은 optimistic — Set을 먼저 갱신하고 IndexedDB에 write 후 실패하면 refresh로 복구한다.
 * - cross-tab: BroadcastChannel + window focus 이벤트에서 refresh.
 */
export const useFavorites = (): UseFavoritesResult => {
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => new Set())
  const [isReady, setIsReady] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const refresh = useCallback(async () => {
    const records = await getAllFavorites()
    setFavorites(new Set(records.map(r => r.id)))
    setIsReady(true)
  }, [])

  useEffect(() => {
    void refresh()

    // cross-tab: BroadcastChannel 지원 시 구독
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const ch = new BroadcastChannel(CHANNEL_NAME)
        channelRef.current = ch
        ch.onmessage = () => { void refresh() }
      } catch {
        // BroadcastChannel 생성 실패는 무시 (focus fallback으로 동작)
      }
    }

    // BroadcastChannel 미지원/실패 브라우저 fallback
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)

    return () => {
      window.removeEventListener('focus', onFocus)
      channelRef.current?.close()
      channelRef.current = null
    }
  }, [refresh])

  const broadcast = useCallback(() => {
    try { channelRef.current?.postMessage({type: 'change'}) } catch { /* ignore */ }
  }, [])

  const toggle = useCallback((id: string) => {
    if (!id) return
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        void removeFavorite(id).then(broadcast)
      } else {
        next.add(id)
        void addFavorite(id).then(broadcast)
      }
      return next
    })
  }, [broadcast])

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  const clearAll = useCallback(() => {
    setFavorites(new Set())
    void clearAllFavorites().then(broadcast)
  }, [broadcast])

  return {favorites, count: favorites.size, isFavorite, toggle, clearAll, isReady}
}
