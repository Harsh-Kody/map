import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  // ✅ Initialize IndexedDB
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RobotAnalyticsDB', 1);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;

        if (!db.objectStoreNames.contains('robotFenceData'))
          db.createObjectStore('robotFenceData', { keyPath: 'id' });

        if (!db.objectStoreNames.contains('robotStats'))
          db.createObjectStore('robotStats', { keyPath: 'robotId' });

        if (!db.objectStoreNames.contains('drivingData'))
          db.createObjectStore('drivingData', { keyPath: 'robotId' });

        if (!db.objectStoreNames.contains('aisleVisits'))
          db.createObjectStore('aisleVisits', { keyPath: 'name' });
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result as IDBDatabase;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ✅ Open a store (readonly or readwrite)
  private async getStore(store: string, mode: IDBTransactionMode) {
    const db = this.db || (await this.dbReady);
    return db.transaction(store, mode).objectStore(store);
  }

  // ✅ Set or update data
  async set(store: string, data: any): Promise<void> {
    const storeRef = await this.getStore(store, 'readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = storeRef.put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ✅ Get data by key
  async get(store: string, key: string): Promise<any> {
    const storeRef = await this.getStore(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = storeRef.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ✅ Get all data from a store
  async getAll(store: string): Promise<any[]> {
    const storeRef = await this.getStore(store, 'readonly');
    return new Promise((resolve, reject) => {
      const req = storeRef.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ✅ Delete a specific key
  // async delete(store: string, key: string): Promise<void> {
  //   const storeRef = await this.getStore(store, 'readwrite');
  //   return new Promise((resolve, reject) => {
  //     const req = storeRef.delete(key);
  //     req.onsuccess = () => resolve();
  //     req.onerror = () => reject(req.error);
  //   });
  // }

  // // ✅ Clear a full store
  // async clear(store: string): Promise<void> {
  //   const storeRef = await this.getStore(store, 'readwrite');
  //   return new Promise((resolve, reject) => {
  //     const req = storeRef.clear();
  //     req.onsuccess = () => resolve();
  //     req.onerror = () => reject(req.error);
  //   });
  // }
}
