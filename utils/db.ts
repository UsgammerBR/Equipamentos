import { AppData } from '../types';

const DB_NAME = 'EquipTrackDB';
const DB_VERSION = 1;
const STORE_NAME = 'equipmentData';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject("Erro ao abrir banco de dados");

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveAppDataToDB = async (data: AppData): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, 'root');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("Erro ao salvar no IndexedDB", e);
  }
};

export const loadAppDataFromDB = async (): Promise<AppData | null> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('root');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as AppData);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Erro ao carregar do IndexedDB", e);
    return null;
  }
};