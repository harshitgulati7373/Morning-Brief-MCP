import NodeCache from 'node-cache';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { CacheEntry } from '../types/marketData';

export class CacheManager {
  private memoryCache: NodeCache;
  private db: sqlite3.Database | null = null;
  private dbInitialized = false;

  constructor(private dbPath: string = './data/cache.db') {
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 1 hour default TTL
      checkperiod: 600, // Check for expired keys every 10 minutes
    });
  }

  async initializeDatabase(): Promise<void> {
    if (this.dbInitialized) return;

    // Ensure the directory for the database exists
    const dbDir = require('path').dirname(this.dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        this.db!.run(`
          CREATE TABLE IF NOT EXISTS cache_entries (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            ttl INTEGER NOT NULL
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          this.dbInitialized = true;
          resolve();
        });
      });
    });
  }

  async get(key: string): Promise<any> {
    // Try memory cache first
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== undefined) {
      return memoryValue;
    }

    // Try persistent cache
    if (!this.dbInitialized) {
      await this.initializeDatabase();
    }

    return new Promise((resolve, reject) => {
      this.db!.get(
        'SELECT value, timestamp, ttl FROM cache_entries WHERE key = ?',
        [key],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(undefined);
            return;
          }

          const now = Date.now();
          const isExpired = now > (row.timestamp + row.ttl * 1000);

          if (isExpired) {
            // Clean up expired entry
            this.delete(key);
            resolve(undefined);
            return;
          }

          try {
            const value = JSON.parse(row.value);
            // Cache in memory for faster access
            this.memoryCache.set(key, value, Math.floor((row.timestamp + row.ttl * 1000 - now) / 1000));
            resolve(value);
          } catch (parseErr) {
            reject(parseErr);
          }
        }
      );
    });
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(key, value, ttlSeconds);

    // Set in persistent cache
    if (!this.dbInitialized) {
      await this.initializeDatabase();
    }

    const timestamp = Date.now();
    const serializedValue = JSON.stringify(value);

    return new Promise((resolve, reject) => {
      this.db!.run(
        'INSERT OR REPLACE INTO cache_entries (key, value, timestamp, ttl) VALUES (?, ?, ?, ?)',
        [key, serializedValue, timestamp, ttlSeconds],
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  async delete(key: string): Promise<void> {
    // Delete from memory cache
    this.memoryCache.del(key);

    // Delete from persistent cache
    if (!this.dbInitialized) {
      await this.initializeDatabase();
    }

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM cache_entries WHERE key = ?', [key], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.flushAll();

    // Clear persistent cache
    if (!this.dbInitialized) {
      await this.initializeDatabase();
    }

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM cache_entries', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async cleanup(): Promise<void> {
    const now = Date.now();

    if (!this.dbInitialized) {
      await this.initializeDatabase();
    }

    return new Promise((resolve, reject) => {
      this.db!.run('DELETE FROM cache_entries WHERE timestamp + (ttl * 1000) < ?', [now], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}