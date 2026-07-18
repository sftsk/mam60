import type { QuizProgress } from './types';

const DATABASE_NAME = 'geburtstags-jeopardy';
const DATABASE_VERSION = 1;
const STORE_NAME = 'progress';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB wird von diesem Browser nicht unterstützt.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB konnte nicht geöffnet werden.'));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB-Vorgang fehlgeschlagen.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('IndexedDB-Transaktion fehlgeschlagen.'));
    };
  });
}

export function loadProgress(quizId: string): Promise<QuizProgress | undefined> {
  return transact('readonly', (store) => store.get(quizId));
}

export function saveProgress(progress: QuizProgress): Promise<IDBValidKey> {
  return transact('readwrite', (store) => store.put(progress, progress.quizId));
}

export async function deleteProgress(quizId: string): Promise<void> {
  await transact('readwrite', (store) => store.delete(quizId));
}
