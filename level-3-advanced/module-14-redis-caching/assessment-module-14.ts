/**
 * assessment-module-14.ts
 *
 * Automated Practical Assessment Suite for Module 14:
 * In-Memory Caching (Redis), Distributed Locks & Advanced State Management
 *
 * Execution: node --experimental-strip-types assessment-module-14.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. IN-MEMORY CACHE ENGINE & DEFENSE IMPLEMENTATION
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MasterCacheManager {
  private memoryStore: Map<string, CacheEntry<any>>;
  private inflightPromises: Map<string, Promise<any>>;

  constructor() {
    this.memoryStore = new Map();
    this.inflightPromises = new Map();
  }

  public get<T>(key: string): T | null {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  public set<T>(key: string, value: T, ttlMs: number): void {
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  public computeJitter(baseMs: number, variance = 100): number {
    const delta = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
    return Math.max(10, baseMs + delta);
  }

  public async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttlMs: number
  ): Promise<T | null> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      if (cached === ('__NULL_CACHE__' as unknown as T)) {
        return null;
      }
      return cached;
    }

    // Singleflight coalescing (Stampede protection)
    if (this.inflightPromises.has(key)) {
      return await this.inflightPromises.get(key);
    }

    const promise = (async () => {
      try {
        const val = await fetcher();
        if (val === null) {
          // Penetration defense
          this.set(key, '__NULL_CACHE__' as unknown as T, 200);
          return null;
        }
        const jitteredTtl = this.computeJitter(ttlMs, 50);
        this.set(key, val, jitteredTtl);
        return val;
      } finally {
        this.inflightPromises.delete(key);
      }
    })();

    this.inflightPromises.set(key, promise);
    const result = await promise;
    if (result === ('__NULL_CACHE__' as unknown as T)) {
      return null;
    }
    return result;
  }
}

// ============================================================================
// 2. DISTRIBUTED LOCK & LUA RELEASE IMPLEMENTATION
// ============================================================================

export interface LockHolder {
  token: string;
  expiresAt: number;
}

export class MasterDistributedLock {
  private locks: Map<string, LockHolder>;

  constructor() {
    this.locks = new Map();
  }

  public acquire(resource: string, ttlMs: number): { success: boolean; token: string | null } {
    const now = Date.now();
    const current = this.locks.get(resource);

    if (current && now < current.expiresAt) {
      return { success: false, token: null };
    }

    const token = `tok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.locks.set(resource, { token, expiresAt: now + ttlMs });
    return { success: true, token };
  }

  public release(resource: string, token: string): boolean {
    const current = this.locks.get(resource);
    if (!current) return false;

    // Verifikasi kepemilikan token atomik (Lua equivalent)
    if (current.token === token) {
      this.locks.delete(resource);
      return true;
    }

    return false;
  }
}

// ============================================================================
// 3. SLIDING WINDOW RATE LIMITER IMPLEMENTATION (ZSET)
// ============================================================================

export class MasterSlidingWindowLimiter {
  private zsetMap: Map<string, Array<{ member: string; score: number }>>;

  constructor() {
    this.zsetMap = new Map();
  }

  public checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const boundary = now - windowMs;

    let records = this.zsetMap.get(key) || [];
    // ZREMRANGEBYSCORE key 0 boundary
    records = records.filter(r => r.score > boundary);

    // ZCARD key
    if (records.length < maxRequests) {
      records.push({ member: `req-${now}`, score: now });
      this.zsetMap.set(key, records);
      return true;
    }

    this.zsetMap.set(key, records);
    return false;
  }
}

// ============================================================================
// 4. REDIS HASHES & PUB/SUB IMPLEMENTATION
// ============================================================================

export class MasterRedisDataStructures {
  private hashes: Map<string, Map<string, string>>;
  private subs: Map<string, Set<(data: string) => void>>;

  constructor() {
    this.hashes = new Map();
    this.subs = new Map();
  }

  public hset(key: string, field: string, value: string): void {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    this.hashes.get(key)!.set(field, value);
  }

  public hget(key: string, field: string): string | null {
    return this.hashes.get(key)?.get(field) || null;
  }

  public hincrby(key: string, field: string, amount: number): number {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    const hash = this.hashes.get(key)!;
    const current = parseInt(hash.get(field) || '0', 10);
    const updated = current + amount;
    hash.set(field, updated.toString());
    return updated;
  }

  public subscribe(channel: string, cb: (data: string) => void): () => void {
    if (!this.subs.has(channel)) this.subs.set(channel, new Set());
    this.subs.get(channel)!.add(cb);
    return () => this.subs.get(channel)?.delete(cb);
  }

  public publish(channel: string, msg: string): number {
    const listeners = this.subs.get(channel);
    if (!listeners) return 0;
    for (const l of listeners) l(msg);
    return listeners.size;
  }
}

// ============================================================================
// 5. MASTER ASSESSMENT EXECUTION
// ============================================================================

async function runModule14Assessment(): Promise<void> {
  console.log('================================================================');
  console.log('🎓 MODULE 14 ASSESSMENT: IN-MEMORY CACHING & DISTRIBUTED STATE');
  console.log('================================================================');

  let passedTests = 0;
  const totalTests = 6;

  // TEST 1: Cache-Aside Lifecycle & TTL Expiration
  console.log('\n[Suite 1/6] Menguji Pola Cache-Aside & Siklus TTL Expiration...');
  const cache = new MasterCacheManager();
  let dbCalls = 0;
  const mockDbFetch = async () => {
    dbCalls++;
    return { id: 'ws-77', name: 'Dev Workspace' };
  };

  // 1. Initial Miss -> DB Fetch
  const data1 = await cache.getOrFetch('workspace:ws-77', mockDbFetch, 200);
  assert.equal(data1?.id, 'ws-77');
  assert.equal(dbCalls, 1);

  // 2. Cache Hit -> DB Tidak Dipanggil
  const data2 = await cache.getOrFetch('workspace:ws-77', mockDbFetch, 200);
  assert.equal(data2?.id, 'ws-77');
  assert.equal(dbCalls, 1, 'Cache Hit tidak boleh menambah DB calls');

  // 3. TTL Expiration (tunggu 260ms)
  await new Promise(r => setTimeout(r, 260));
  const data3 = await cache.getOrFetch('workspace:ws-77', mockDbFetch, 200);
  assert.equal(data3?.id, 'ws-77');
  assert.equal(dbCalls, 2, 'Setelah TTL expired, data harus di-fetch ulang dari DB');
  passedTests++;
  console.log('  ✅ PASSED: Cache Hit, Miss, dan TTL Expiration terbukti bekerja sempurna.');

  // TEST 2: Cache Stampede Mitigation (50 Concurrent Requests) & Penetration Defense
  console.log('\n[Suite 2/6] Menguji Mitigasi Cache Stampede & Cache Penetration...');
  let hotKeyDbCalls = 0;
  const hotKeyFetch = async () => {
    hotKeyDbCalls++;
    await new Promise(r => setTimeout(r, 20));
    return { id: 'hot-task-1', title: 'Critical Bugfix' };
  };

  // Tembakkan 50 request simultan pada key yang belum ada di cache
  const concurrentReqs: Promise<any>[] = [];
  for (let i = 0; i < 50; i++) {
    concurrentReqs.push(cache.getOrFetch('task:hot-task-1', hotKeyFetch, 2000));
  }
  const results = await Promise.all(concurrentReqs);
  assert.equal(results.length, 50);
  assert.equal(hotKeyDbCalls, 1, '50 concurrent requests harus di-coalesce menjadi TEPAT 1 DB query!');

  // Penetrasi: Query ID fiktif
  let fakeDbCalls = 0;
  const fakeFetch = async () => {
    fakeDbCalls++;
    return null; // DB tidak menemukan data
  };
  const fake1 = await cache.getOrFetch('task:non-existent', fakeFetch, 500);
  assert.equal(fake1, null);
  assert.equal(fakeDbCalls, 1);

  // 5 panggilan berikutnya harus dicegah oleh sentinel
  for (let i = 0; i < 5; i++) {
    const f = await cache.getOrFetch('task:non-existent', fakeFetch, 500);
    assert.equal(f, null);
  }
  assert.equal(fakeDbCalls, 1, 'Sentinel harus memblokir 5 query ID fiktif berikutnya');
  passedTests++;
  console.log('  ✅ PASSED: Stampede teratasi (50 reqs -> 1 DB query) & Penetration terblokir sentinel.');

  // TEST 3: Distributed Lock Acquisition & Mutual Exclusion
  console.log('\n[Suite 3/6] Menguji Distributed Lock Mutual Exclusion (SET NX PX)...');
  const dlock = new MasterDistributedLock();

  const lock1 = dlock.acquire('resource:cron:billing', 300);
  assert.equal(lock1.success, true);
  assert.notEqual(lock1.token, null);

  // Worker 2 mencoba lock resource yang sama
  const lock2 = dlock.acquire('resource:cron:billing', 300);
  assert.equal(lock2.success, false, 'Worker 2 harus ditolak karena resource sedang terkunci');
  assert.equal(lock2.token, null);
  passedTests++;
  console.log('  ✅ PASSED: Mutual exclusion terverifikasi, worker lain ditolak saat resource dikunci.');

  // TEST 4: Lua Atomic Release & Anti-Hijack Defense
  console.log('\n[Suite 4/6] Menguji Pelepasan Lock Aman via Token Matching...');
  // Coba lepas dengan token salah
  const wrongTokenRelease = dlock.release('resource:cron:billing', 'wrong-token');
  assert.equal(wrongTokenRelease, false);

  // Lepas dengan token yang benar
  const validRelease = dlock.release('resource:cron:billing', lock1.token!);
  assert.equal(validRelease, true);

  // Worker 2 kini bisa mengunci
  const lock2Retry = dlock.acquire('resource:cron:billing', 200);
  assert.equal(lock2Retry.success, true);

  // Tunggu hingga lock Worker 2 expired (220ms)
  await new Promise(r => setTimeout(r, 220));

  // Worker 3 mengunci
  const lock3 = dlock.acquire('resource:cron:billing', 500);
  assert.equal(lock3.success, true);

  // Worker 2 bangun terlambat dan mencoba melepas lock lamanya
  const expiredRelease = dlock.release('resource:cron:billing', lock2Retry.token!);
  assert.equal(expiredRelease, false, 'Worker 2 tidak boleh melepas lock milik Worker 3!');
  passedTests++;
  console.log('  ✅ PASSED: Pelepasan lock terlambat berhasil dicegah dari merusak lock worker lain.');

  // TEST 5: Sliding Window Rate Limiter (ZSET)
  console.log('\n[Suite 5/6] Menguji Sliding Window Rate Limiter (ZSET)...');
  const limiter = new MasterSlidingWindowLimiter();
  const userKey = 'ratelimit:ip:192.168.1.50';

  // Limit 3 requests per 300ms
  assert.equal(limiter.checkLimit(userKey, 3, 300), true);
  assert.equal(limiter.checkLimit(userKey, 3, 300), true);
  assert.equal(limiter.checkLimit(userKey, 3, 300), true);
  assert.equal(limiter.checkLimit(userKey, 3, 300), false, 'Request ke-4 harus diblokir');

  // Tunggu 320ms agar jendela bergulir
  await new Promise(r => setTimeout(r, 320));
  assert.equal(limiter.checkLimit(userKey, 3, 300), true, 'Request ke-5 harus diizinkan setelah window lewat');
  passedTests++;
  console.log('  ✅ PASSED: Sliding Window Log ZSET berhasil membatasi dan menggulir kuota.');

  // TEST 6: Redis Hashes & Pub/Sub Real-time Messaging
  console.log('\n[Suite 6/6] Menguji Redis Hashes (HINCRBY) & Realtime Pub/Sub...');
  const redisDs = new MasterRedisDataStructures();

  // Hashes
  redisDs.hset('task:analytics', 'completedCount', '100');
  const incremented = redisDs.hincrby('task:analytics', 'completedCount', 25);
  assert.equal(incremented, 125);
  assert.equal(redisDs.hget('task:analytics', 'completedCount'), '125');

  // Pub/Sub
  const eventsReceived: string[] = [];
  const unsub = redisDs.subscribe('task:notifications', (msg) => {
    eventsReceived.push(msg);
  });

  const subsNotified = redisDs.publish('task:notifications', 'TASK_CREATED:999');
  assert.equal(subsNotified, 1);
  assert.equal(eventsReceived.length, 1);
  assert.equal(eventsReceived[0], 'TASK_CREATED:999');
  unsub();
  passedTests++;
  console.log('  ✅ PASSED: Redis Hashes atomic increment dan Pub/Sub broadcast berfungsi 100%.');

  // FINAL SCORING & CERTIFICATION
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI ASSESSMENT MODULE 14: ${passedTests}/${totalTests} SUITES PASSED`);
  const score = Math.round((passedTests / totalTests) * 100);
  console.log(`🎯 SKOR AKHIR: ${score}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: MODULE 14 DINYATAKAN LULUS (GRADE A)');
  console.log('🔓 MODULE 15 (ASYNCHRONOUS MESSAGING & EVENT-DRIVEN: KAFKA) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runModule14Assessment().catch(err => {
  console.error('❌ Assessment failed with error:', err);
  process.exit(1);
});
