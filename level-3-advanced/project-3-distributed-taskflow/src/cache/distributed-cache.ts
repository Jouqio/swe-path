/**
 * src/cache/distributed-cache.ts
 *
 * In-Memory Redis Caching & Distributed Locks:
 * - Cache-Aside with Singleflight Coalescing (Stampede Defense)
 * - Sentinel Null Caching (Penetration Defense)
 * - Distributed Lock (SET NX PX) with Token-Matching Lua Release
 */

export interface CachePayload<T> {
  data: T;
  expiresAt: number;
}

export class DistributedCacheService {
  private cacheStore: Map<string, CachePayload<any>>;
  private inflightFetches: Map<string, Promise<any>>;

  constructor() {
    this.cacheStore = new Map();
    this.inflightFetches = new Map();
  }

  public get<T>(key: string): T | null {
    const item = this.cacheStore.get(key);
    if (!item) return null;
    if (Date.now() >= item.expiresAt) {
      this.cacheStore.delete(key);
      return null;
    }
    return item.data;
  }

  public set<T>(key: string, data: T, ttlMs: number): void {
    this.cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  public async getOrLoad<T>(
    key: string,
    databaseFetcher: () => Promise<T | null>,
    ttlMs: number
  ): Promise<T | null> {
    const existing = this.get<T>(key);
    if (existing !== null) {
      if (existing === ('__NULL_PLACEHOLDER__' as unknown as T)) return null;
      return existing;
    }

    // Singleflight coalescing: gabungkan request simultan pada key yang sama
    if (this.inflightFetches.has(key)) {
      return await this.inflightFetches.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const dbResult = await databaseFetcher();
        if (dbResult === null) {
          // Sentinel caching (Penetration protection)
          this.set(key, '__NULL_PLACEHOLDER__' as unknown as T, 200);
          return null;
        }
        this.set(key, dbResult, ttlMs);
        return dbResult;
      } finally {
        this.inflightFetches.delete(key);
      }
    })();

    this.inflightFetches.set(key, fetchPromise);
    const finalResult = await fetchPromise;
    if (finalResult === ('__NULL_PLACEHOLDER__' as unknown as T)) return null;
    return finalResult;
  }
}

export class DistributedLockService {
  private locks: Map<string, { token: string; expiresAt: number }>;

  constructor() {
    this.locks = new Map();
  }

  public acquire(resourceKey: string, ttlMs: number): { success: boolean; token: string | null } {
    const now = Date.now();
    const existing = this.locks.get(resourceKey);

    if (existing && now < existing.expiresAt) {
      return { success: false, token: null };
    }

    const token = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.locks.set(resourceKey, { token, expiresAt: now + ttlMs });
    return { success: true, token };
  }

  public release(resourceKey: string, token: string): boolean {
    const existing = this.locks.get(resourceKey);
    if (!existing) return false;

    // Lua atomic release equivalent: hanya lepas jika token pemanggil identik
    if (existing.token === token) {
      this.locks.delete(resourceKey);
      return true;
    }

    return false;
  }
}
