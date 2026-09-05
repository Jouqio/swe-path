/**
 * lesson-14.2-practice.ts
 *
 * Distributed State & Advanced Redis Synchronization:
 * 1. Distributed Lock with Unique Token & Lua Atomic Release
 * 2. Sliding Window Rate Limiter using Redis Sorted Set (ZSET) Logic
 * 3. Redis Hashes for Partial Object Updates
 * 4. Pub/Sub Realtime Message Bus
 *
 * Execution: node --experimental-strip-types lesson-14.2-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. DISTRIBUTED LOCK ENGINE (REDLOCK / SET NX PX PATTERN)
// ============================================================================

export interface LockState {
  token: string;
  expiresAt: number;
}

export class DistributedLockManager {
  private locks: Map<string, LockState>;

  constructor() {
    this.locks = new Map();
  }

  /**
   * SET resource token NX PX ttlMs
   */
  public acquireLock(resource: string, ttlMs: number): { acquired: boolean; token: string | null } {
    const now = Date.now();
    const current = this.locks.get(resource);

    // Jika lock sudah ada dan belum expired -> gagal akuisisi
    if (current && now < current.expiresAt) {
      return { acquired: false, token: null };
    }

    // Token unik acak untuk membedakan identitas pemilik
    const token = `tok-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.locks.set(resource, {
      token,
      expiresAt: now + ttlMs
    });

    return { acquired: true, token };
  }

  /**
   * Simulasi Lua Script Atomik:
   * if redis.call("get", KEYS[1]) == ARGV[1] then
   *   return redis.call("del", KEYS[1])
   * else
   *   return 0
   * end
   */
  public releaseLock(resource: string, token: string): boolean {
    const current = this.locks.get(resource);
    if (!current) {
      return false; // Lock sudah tidak ada (misal sudah expired)
    }

    if (current.token === token) {
      this.locks.delete(resource);
      return true; // Berhasil dilepas oleh pemilik sah
    }

    // Token TIDAK COCOK! Mencegah menghapus lock milik orang lain
    return false;
  }

  public isLocked(resource: string): boolean {
    const current = this.locks.get(resource);
    if (!current) return false;
    if (Date.now() >= current.expiresAt) {
      this.locks.delete(resource);
      return false;
    }
    return true;
  }
}

// ============================================================================
// 2. SLIDING WINDOW RATE LIMITER (ZSET LOGIC)
// ============================================================================

export interface ZSetMember {
  member: string;
  score: number; // epoch timestamp ms
}

export class SlidingWindowRateLimiter {
  private storage: Map<string, ZSetMember[]>;

  constructor() {
    this.storage = new Map();
  }

  public isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entries = this.storage.get(key) || [];

    // 1. ZREMRANGEBYSCORE key 0 windowStart (Buang item lama di luar jendela geser)
    entries = entries.filter(e => e.score > windowStart);

    // 2. ZCARD key (Hitung jumlah item aktif)
    if (entries.length < limit) {
      // 3. ZADD key now member
      entries.push({
        member: `req-${now}-${Math.random().toString(36).slice(2, 7)}`,
        score: now
      });
      this.storage.set(key, entries);
      return true;
    }

    this.storage.set(key, entries);
    return false;
  }

  public getCount(key: string): number {
    return (this.storage.get(key) || []).length;
  }
}

// ============================================================================
// 3. REDIS HASHES & PUB/SUB EMULATOR
// ============================================================================

export class RedisHashManager {
  private hashes: Map<string, Map<string, string>>;

  constructor() {
    this.hashes = new Map();
  }

  public hset(key: string, field: string, value: string): void {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    this.hashes.get(key)!.set(field, value);
  }

  public hget(key: string, field: string): string | null {
    const hash = this.hashes.get(key);
    if (!hash) return null;
    return hash.get(field) || null;
  }

  public hincrby(key: string, field: string, increment: number): number {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;
    const current = parseInt(hash.get(field) || '0', 10);
    const updated = current + increment;
    hash.set(field, updated.toString());
    return updated;
  }

  public hgetall(key: string): Record<string, string> {
    const hash = this.hashes.get(key);
    if (!hash) return {};
    const res: Record<string, string> = {};
    for (const [k, v] of hash.entries()) {
      res[k] = v;
    }
    return res;
  }
}

export class RedisPubSubBus {
  private channels: Map<string, Set<(message: string) => void>>;

  constructor() {
    this.channels = new Map();
  }

  public subscribe(channel: string, listener: (message: string) => void): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(listener);

    // Unsubscribe callback
    return () => {
      this.channels.get(channel)?.delete(listener);
    };
  }

  public publish(channel: string, message: string): number {
    const listeners = this.channels.get(channel);
    if (!listeners) return 0;
    for (const listener of listeners) {
      listener(message);
    }
    return listeners.size;
  }
}

// ============================================================================
// 4. AUTOMATED PRACTICE TEST RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI DISTRIBUTED STATE, LOCKS & ADVANCED DATA STRUCTURES]');

  // Test 1: Distributed Lock Mutex (Mutual Exclusion)
  console.log('\n--- 1. Verifikasi Distributed Lock Mutex (SET NX PX) ---');
  const lockMgr = new DistributedLockManager();

  const worker1 = lockMgr.acquireLock('resource:task:invoice-101', 300);
  assert.equal(worker1.acquired, true, 'Worker 1 harus sukses mengakuisisi lock');
  assert.notEqual(worker1.token, null);
  console.log(`✅ Worker 1 mengakuisisi lock dengan token: ${worker1.token}`);

  // Worker 2 mencoba mengakuisisi resource yang sama -> Harus Gagal
  const worker2 = lockMgr.acquireLock('resource:task:invoice-101', 300);
  assert.equal(worker2.acquired, false, 'Worker 2 harus ditolak (Resource terkunci)');
  assert.equal(worker2.token, null);
  console.log('🛡️ Worker 2 ditolak! Mutual exclusion antar worker berhasil dijaga.');

  // Test 2: Pelepasan Lock Aman via Lua Token Check
  console.log('\n--- 2. Verifikasi Lua Atomic Release & Proteksi Token ---');
  // Coba lepas dengan token palsu
  const falseRelease = lockMgr.releaseLock('resource:task:invoice-101', 'token-palsu-999');
  assert.equal(falseRelease, false, 'Pelepasan dengan token palsu harus ditolak');
  console.log('✅ Pelepasan dengan token palsu berhasil ditolak.');

  // Lepas dengan token yang sah
  const validRelease = lockMgr.releaseLock('resource:task:invoice-101', worker1.token!);
  assert.equal(validRelease, true, 'Pemilik sah harus berhasil melepas lock');
  console.log('✅ Pemilik sah berhasil melepas lock via token matching.');

  // Worker 2 kini dapat mengakuisisi lock
  const worker2Retry = lockMgr.acquireLock('resource:task:invoice-101', 300);
  assert.equal(worker2Retry.acquired, true, 'Worker 2 kini sukses mengakuisisi lock');
  console.log('✅ Worker 2 sukses mengakuisisi lock setelah dilepas.');

  // Test 3: Proteksi Lock Expiration (Anti-Hijack Release)
  console.log('\n--- 3. Verifikasi Proteksi Lock Expiration (Worker A tidak bisa merilis lock Worker B) ---');
  // Biarkan lock Worker 2 expired (tunggu 320ms)
  await new Promise(r => setTimeout(r, 320));

  // Worker 3 mengambil lock baru
  const worker3 = lockMgr.acquireLock('resource:task:invoice-101', 500);
  assert.equal(worker3.acquired, true);

  // Worker 2 yang terlambat bangun mencoba me-release lock lamanya
  const lateReleaseWorker2 = lockMgr.releaseLock('resource:task:invoice-101', worker2Retry.token!);
  assert.equal(lateReleaseWorker2, false, 'Worker 2 tidak boleh menghapus lock baru milik Worker 3');
  console.log('🛡️ Terbukti: Worker terlambat tidak dapat merusak kepemilikan lock worker lain!');

  // Test 4: Sliding Window Rate Limiter
  console.log('\n--- 4. Verifikasi Sliding Window Rate Limiter (ZSET) ---');
  const limiter = new SlidingWindowRateLimiter();
  const limitKey = 'ratelimit:user:dev-123';
  const limit = 3;
  const windowMs = 400; // 3 req per 400ms

  assert.equal(limiter.isAllowed(limitKey, limit, windowMs), true, 'Req 1 lolos');
  assert.equal(limiter.isAllowed(limitKey, limit, windowMs), true, 'Req 2 lolos');
  assert.equal(limiter.isAllowed(limitKey, limit, windowMs), true, 'Req 3 lolos');
  assert.equal(limiter.isAllowed(limitKey, limit, windowMs), false, 'Req 4 harus ditolak (limit 3 tercapai)');
  console.log('✅ Sliding window berhasil membatasi 3 request dalam rentang aktif.');

  // Tunggu hingga jendela waktu bergulir keluar (420ms)
  await new Promise(r => setTimeout(r, 420));
  assert.equal(limiter.isAllowed(limitKey, limit, windowMs), true, 'Req 5 harus lolos karena jendela waktu telah bergulir!');
  console.log('✅ Jendela waktu bergulir sukses: Request baru disetujui setelah interval usai.');

  // Test 5: Redis Hashes & Pub/Sub
  console.log('\n--- 5. Verifikasi Redis Hashes & Pub/Sub ---');
  const hash = new RedisHashManager();
  hash.hset('task:task-100', 'title', 'Distributed Systems');
  hash.hset('task:task-100', 'views', '10');
  const newViews = hash.hincrby('task:task-100', 'views', 5);
  assert.equal(newViews, 15);
  assert.equal(hash.hget('task:task-100', 'title'), 'Distributed Systems');
  console.log(`✅ Redis Hash HINCRBY terverifikasi: views = ${newViews}`);

  const pubsub = new RedisPubSubBus();
  const receivedMessages: string[] = [];
  const unsubscribe = pubsub.subscribe('channel:task_updates', (msg) => {
    receivedMessages.push(msg);
  });

  const receiverCount = pubsub.publish('channel:task_updates', 'TASK_COMPLETED:100');
  assert.equal(receiverCount, 1);
  assert.equal(receivedMessages.length, 1);
  assert.equal(receivedMessages[0], 'TASK_COMPLETED:100');
  unsubscribe();
  console.log('✅ Redis Pub/Sub broadcast berhasil diterima oleh subscriber.');

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES REDIS ADVANCED & DISTRIBUTED STATE 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in practice:', err);
  process.exit(1);
});
