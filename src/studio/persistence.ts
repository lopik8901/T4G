export function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('careplay-studio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('games', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Your browser could not open local storage.'))
  })
}
export async function storageOperation<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('games', mode)
    const request = operation(tx.objectStore('games'))
    tx.oncomplete = () => { db.close(); resolve(request.result) }
    tx.onerror = () => { db.close(); reject(new Error('Could not save locally. Check available browser storage.')) }
    tx.onabort = () => { db.close(); reject(new Error('Local storage operation was interrupted.')) }
  })
}
