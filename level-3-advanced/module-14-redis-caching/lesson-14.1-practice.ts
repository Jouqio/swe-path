/**
 * lesson-14.1-practice.ts
 *
 * In-Memory Caching & Resilient Access Patterns:
 * 1. Cache-Aside Pattern with TTL & Eviction
 * 2. Cache Avalanche Protection (TTL Jitter Calculation)
 * 3. Cache Stampede Mitigation (Singleflight / Promise Coalescing)
 * 4. Cache Penetration Defense (Null Sentinel Caching)
 *
 * Execution: node --experimental-strip-types lesson-14.1-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. IN-MEMORY REDIS EMULATOR & CACHE ENGINE
// ============================================================================

export interface CacheRecord<T> {
  value: T;
  expiresAt: number;
}

export class ResilientCacheEngine {
  private store: Map<string, CacheRecord<any>>;
  private inFlightPromises: Map<string, Promise<any>>;

  constructor() {
    this.store = new Map();
    this.inFlightPromises = new Map();
  }

  public get<T>(key: string): T | null {
    const record = this.store.get(key);
    if (!record) return null;

    // Cek apakah key sudah kedaluwarsa (TTL expired)
    if (Date.now() >= record.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return record.value;
  }

  public set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Menghitung TTL dengan Jitter acak (misal: base 1000ms +- 200ms)
   * untuk mencegah Cache Avalanche.
   */
  public computeTtlWithJitter(baseMs: number, jitterRangeMs = 200): number {
    const jitter = Math.floor(Math.random() * (jitterRangeMs * 2 + 1)) - jitterRangeMs;
    return Math.max(10, baseMs + jitter);
  }

  /**
   * Cache-Aside Fetcher dengan proteksi ganda:
   * - Cache Stampede Protection (Singleflight Coalescing)
   * - Cache Penetration Protection (Null Sentinel Caching)
   */
  public async getOrFetch<T>(
    key: string,
    fetchFromDb: () => Promise<T | null>,
    baseTtlMs: number,
    preventStampede = true
  ): Promise<T | null> {
    // 1. Coba baca dari Cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      if (cached === ('__NULL_SENTINEL__' as unknown as T)) {
        return null;
      }
      return cached;
    }

    // 2. Proteksi Stampede: Jika sudah ada query DB berjalan untuk key ini, gabungkan!
    if (preventStampede && this.inFlightPromises.has(key)) {
      return await this.inFlightPromises.get(key);
    }

    const fetcherPromise = (async () => {
      try {
        const dbResult = await fetchFromDb();

        if (dbResult === null) {
          // Proteksi Penetrasi: Simpan sentinel NULL dengan TTL pendek (100ms)
          this.set(key, '__NULL_SENTINEL__' as unknown as T, 100);
          return null;
        }

        // Terapkan TTL Jitter
        const finalTtl = this.computeTtlWithJitter(baseTtlMs, 50);
        this.set(key, dbResult, finalTtl);
        return dbResult;
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    if (preventStampede) {
      this.inFlightPromises.set(key, fetcherPromise);
    }

    const resolved = await fetcherPromise;
    if (resolved === ('__NULL_SENTINEL__' as unknown as T)) {
      return null;
    }
    return resolved;
  }

  public size(): number {
    return this.store.size;
  }
}

// ============================================================================
// 2. SIMULATED POSTGRESQL DATABASE REPOSITORY
// ============================================================================

export interface TaskRecord {
  id: string;
  title: string;
  status: string;
}

export class MockDatabase {
  public queryCount = 0;
  private tasks: Map<string, TaskRecord> = new Map([
    ['task-1', { id: 'task-1', title: 'Implement Redis Caching', status: 'DONE' }],
    ['task-2', { id: 'task-2', title: 'Setup Kafka Partitioning', status: 'IN_PROGRESS' }]
  ]);

  public async findTaskById(id: string): Promise<TaskRecord | null> {
    this.queryCount++;
    // Simulasikan latensi I/O database (15ms)
    await new Promise(r => setTimeout(r, 15));
    const item = this.tasks.get(id);
    return item ? { ...item } : null;
  }
}

// ============================================================================
// 3. AUTOMATED TEST SUITE & PRACTICE RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI IN-MEMORY CACHING & FAILURE MITIGATION]');

  const cache = new ResilientCacheEngine();
  const db = new MockDatabase();

  // Test 1: Cache-Aside Hit & Miss
  console.log('\n--- 1. Verifikasi Cache-Aside (Miss -> DB Fetch -> Cache Hit) ---');
  db.queryCount = 0;

  // Pemanggilan 1: Harus Cache Miss dan query ke Database
  const res1 = await cache.getOrFetch('task:task-1', () => db.findTaskById('task-1'), 1000);
  assert.equal(res1?.id, 'task-1');
  assert.equal(db.queryCount, 1, 'Query DB harus dipanggil 1 kali saat cache miss');
  console.log(`✅ Request 1: Cache Miss -> DB Query dieksekusi (Total DB Queries: ${db.queryCount}).`);

  // Pemanggilan 2: Harus Cache Hit (Query DB tidak boleh bertambah)
  const res2 = await cache.getOrFetch('task:task-1', () => db.findTaskById('task-1'), 1000);
  assert.equal(res2?.id, 'task-1');
  assert.equal(db.queryCount, 1, 'Query DB tetap 1 (Data disajikan dari cache RAM)');
  console.log(`✅ Request 2: Cache Hit! Respons instan disajikan tanpa menyentuh database.`);

  // Test 2: Cache Stampede Mitigation (Singleflight / 100 Concurrent Requests)
  console.log('\n--- 2. Verifikasi Mitigasi Cache Stampede (100 Concurrent Requests pada Hot Key) ---');
  // Gunakan key baru yang belum ada di cache
  db.queryCount = 0;

  const concurrentPromises: Promise<any>[] = [];
  for (let i = 0; i < 100; i++) {
    concurrentPromises.push(
      cache.getOrFetch('task:task-2', () => db.findTaskById('task-2'), 2000, true)
    );
  }

  const results = await Promise.all(concurrentPromises);
  assert.equal(results.length, 100);
  assert.equal(results[0]?.title, 'Setup Kafka Partitioning');
  // KUNCI EMAS: Meskipun ada 100 request simultan, database hanya boleh di-query TEPAT 1 KALI!
  assert.equal(db.queryCount, 1, `DB query harus tepat 1, terbukti: ${db.queryCount}`);
  console.log(`🛡️ Stampede Teratasi: 100 concurrent requests di-coalesce menjadi TEPAT 1 DB Query!`);

  // Test 3: Cache Penetration Mitigation (Sentinel Null Caching)
  console.log('\n--- 3. Verifikasi Mitigasi Cache Penetration (ID Fiktif / Non-Existent) ---');
  db.queryCount = 0;

  // Request ID palsu pertama kali -> miss DB -> simpan sentinel
  const fake1 = await cache.getOrFetch('task:fake-999', () => db.findTaskById('fake-999'), 500);
  assert.equal(fake1, null);
  assert.equal(db.queryCount, 1);
  console.log('✅ Request ID fiktif pertama: DB mengembalikan null, sentinel tersimpan di cache.');

  // Request ID palsu 10 kali berikutnya -> Harus di-intercept oleh cache sentinel tanpa query DB!
  for (let i = 0; i < 10; i++) {
    const fakeSubsequent = await cache.getOrFetch('task:fake-999', () => db.findTaskById('fake-999'), 500);
    assert.equal(fakeSubsequent, null);
  }
  assert.equal(db.queryCount, 1, '10 request ID fiktif berikutnya TIDAK BOLEH menyentuh database!');
  console.log(`🛡️ Penetration Teratasi: 10 request ID palsu diblokir oleh sentinel cache (DB Query tetap: ${db.queryCount}).`);

  // Test 4: TTL Jitter Calculation
  console.log('\n--- 4. Verifikasi Algoritma TTL Jitter ---');
  const baseTtl = 3600;
  const samples: number[] = [];
  for (let i = 0; i < 10; i++) {
    samples.push(cache.computeTtlWithJitter(baseTtl, 100));
  }
  const allIdentical = samples.every(s => s === samples[0]);
  assert.equal(allIdentical, false, 'TTL dengan jitter harus memiliki variasi acak');
  console.log(`✅ TTL Jitter terverifikasi: Variasi sampel = [${samples.slice(0, 5).join(', ')}...]`);

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES REDIS CACHING PATTERNS 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in caching practice:', err);
  process.exit(1);
});
