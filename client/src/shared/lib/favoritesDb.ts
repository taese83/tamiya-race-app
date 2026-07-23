/**
 * 즐겨찾기 IndexedDB helpers
 *
 * DB: tamiya-race-favorites (v1)
 * Store: favorites (keyPath: id) — {id: string, addedAt: number}
 *
 * IndexedDB 접근 실패 (private mode, quota 등) 시 상위 호출자가 in-memory fallback으로 동작하도록
 * 모든 함수는 실패 시 undefined/[]를 리턴하고 throw하지 않는다.
 */
const DB_NAME = 'tamiya-race-favorites'
const DB_VERSION = 1
const STORE = 'favorites'

export interface FavoriteRecord {
  id: string
  addedAt: number
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') { resolve(null); return }
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, {keyPath: 'id'})
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
}

function runTx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | null): Promise<T | null> {
  return new Promise(async resolve => {
    const db = await openDb()
    if (!db) { resolve(null); return }
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE, mode)
    } catch {
      db.close()
      resolve(null)
      return
    }
    const store = tx.objectStore(STORE)
    const req = run(store)
    tx.oncomplete = () => {
      db.close()
      resolve((req?.result as T | undefined) ?? null)
    }
    tx.onerror = () => { db.close(); resolve(null) }
    tx.onabort = () => { db.close(); resolve(null) }
    if (!req) resolve(null)
  })
}

export async function getAllFavorites(): Promise<FavoriteRecord[]> {
  const result = await runTx<FavoriteRecord[]>('readonly', store => store.getAll() as IDBRequest<FavoriteRecord[]>)
  if (!Array.isArray(result)) return []
  // IndexedDB 값은 외부 입력 — 스키마 검증 후 반환
  return result.filter((r): r is FavoriteRecord =>
    r != null && typeof r === 'object'
    && typeof (r as FavoriteRecord).id === 'string'
    && (r as FavoriteRecord).id.length > 0
    && typeof (r as FavoriteRecord).addedAt === 'number'
  )
}

export async function addFavorite(id: string): Promise<void> {
  await runTx('readwrite', store => store.put({id, addedAt: Date.now()}))
}

export async function removeFavorite(id: string): Promise<void> {
  await runTx('readwrite', store => store.delete(id))
}

export async function clearAllFavorites(): Promise<void> {
  await runTx('readwrite', store => store.clear())
}
