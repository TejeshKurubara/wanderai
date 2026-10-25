/**
 * WanderAI Offline-First IndexedDB Storage Service
 * Provides client-side caching for trips, itineraries, bookings,
 * and queues offline transactions to sync automatically upon reconnecting.
 */

const DB_NAME = 'wanderai_offline_db';
const DB_VERSION = 1;

export interface QueuedExpense {
  queue_id?: number;
  trip_id: string;
  data: any;
  created_at: string;
}

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Trips Cache
        if (!db.objectStoreNames.contains('trips')) {
          db.createObjectStore('trips', { keyPath: 'id' });
        }

        // Bookings Cache
        if (!db.objectStoreNames.contains('bookings')) {
          db.createObjectStore('bookings', { keyPath: 'trip_id' });
        }

        // Expenses Cache
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'trip_id' });
        }

        // Offline Expense Sync Queue
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'queue_id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Trip Caching ---
  async cacheTrip(trip: any): Promise<void> {
    if (!trip || !trip.id) return;
    try {
      const db = await this.getDB();
      const tx = db.transaction('trips', 'readwrite');
      tx.objectStore('trips').put({
        ...trip,
        _cached_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to cache trip:', err);
    }
  }

  async getCachedTrip(tripId: string): Promise<any | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('trips', 'readonly');
        const req = tx.objectStore('trips').get(tripId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  // --- Bookings Caching ---
  async cacheBookings(tripId: string, bookings: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('bookings', 'readwrite');
      tx.objectStore('bookings').put({
        trip_id: tripId,
        bookings: bookings || [],
        _cached_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to cache bookings:', err);
    }
  }

  async getCachedBookings(tripId: string): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('bookings', 'readonly');
        const req = tx.objectStore('bookings').get(tripId);
        req.onsuccess = () => resolve(req.result?.bookings || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // --- Expenses Caching ---
  async cacheExpenses(tripId: string, expenses: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('expenses', 'readwrite');
      tx.objectStore('expenses').put({
        trip_id: tripId,
        expenses: expenses || [],
        _cached_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[OfflineStorage] Failed to cache expenses:', err);
    }
  }

  async getCachedExpenses(tripId: string): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('expenses', 'readonly');
        const req = tx.objectStore('expenses').get(tripId);
        req.onsuccess = () => resolve(req.result?.expenses || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // --- Offline Sync Queue ---
  async enqueueOfflineExpense(tripId: string, expenseData: any): Promise<number> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('offline_queue', 'readwrite');
        const req = tx.objectStore('offline_queue').add({
          trip_id: tripId,
          data: expenseData,
          created_at: new Date().toISOString(),
        });
        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('[OfflineStorage] Error enqueuing expense:', err);
      throw err;
    }
  }

  async getOfflineQueue(): Promise<QueuedExpense[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('offline_queue', 'readonly');
        const req = tx.objectStore('offline_queue').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async removeQueueItem(queueId: number): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('offline_queue', 'readwrite');
      tx.objectStore('offline_queue').delete(queueId);
    } catch (err) {
      console.warn('[OfflineStorage] Failed to remove queue item:', err);
    }
  }

  async processSyncQueue(
    onSyncItem: (item: QueuedExpense) => Promise<boolean>
  ): Promise<{ synced: number; failed: number }> {
    const queue = await this.getOfflineQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const success = await onSyncItem(item);
        if (success && item.queue_id !== undefined) {
          await this.removeQueueItem(item.queue_id);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  }
}

export const offlineStorage = new OfflineStorageService();
