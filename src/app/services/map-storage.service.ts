import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MapRecord {
  id: string;
  file: Blob;
}

interface MapDB extends DBSchema {
  maps: {
    key: string;
    value: MapRecord;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MapStorageService {
  private dbPromise: Promise<IDBPDatabase<MapDB>>;

  constructor() {
    this.dbPromise = openDB<MapDB>('MapDatabase', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('maps')) {
          db.createObjectStore('maps', { keyPath: 'id' }); // ✅ keyPath
        }
      },
    });
  }

  async saveMap(key: string, file: File): Promise<void> {
    const db = await this.dbPromise;
    await db.put('maps', { id: key, file }); // ✅ store with id
  }

  async getMap(key: string): Promise<Blob | undefined> {
    const db = await this.dbPromise;
    const record = await db.get('maps', key);
    return record?.file;
  }

  async deleteMap(key: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('maps', key);
  }
}
