// Tiny IndexedDB wrapper. Stores: pages (by id), audio (by cache key), kv (misc).
type Store = 'pages' | 'audio' | 'kv'
let opened: Promise<IDBDatabase> | undefined

function open(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('book-to-audio', 1)
    req.onupgradeneeded = () => {
      for (const name of ['pages', 'audio', 'kv']) req.result.createObjectStore(name)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return opened
}

async function run<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

export const get = <T>(store: Store, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key))
export const put = (store: Store, key: string, value: unknown) => run(store, 'readwrite', (s) => s.put(value, key))
export const del = (store: Store, key: string) => run(store, 'readwrite', (s) => s.delete(key))
export const clear = (store: Store) => run(store, 'readwrite', (s) => s.clear())
export const all = <T>(store: Store) => run<T[]>(store, 'readonly', (s) => s.getAll())
