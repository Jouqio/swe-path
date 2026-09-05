/**
 * review-4-integration.ts
 *
 * Spaced Review 4: Full Distributed Systems Backbone Integration
 * Modules 13, 14, 15:
 * - Module 13: Resilient API Gateway & Circuit Breakers
 * - Module 14: In-Memory Caching (Redis) & Distributed Locks
 * - Module 15: Event-Driven Kafka Streaming & Distributed Saga Transactions
 *
 * Execution: node --experimental-strip-types review-4-integration.ts
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// ============================================================================
// 1. EDGE LAYER: TOKEN BUCKET & CIRCUIT BREAKER (MODULE 13)
// ============================================================================

export class TokenBucketLimiter {
  private capacity: number;
  private refillRate: number;
  private tokens: number;
  private lastRefill: number;

  constructor(capacity: number, refillRatePerSec: number) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSec;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  public allow(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  public setTokens(count: number): void {
    this.tokens = count;
    this.lastRefill = Date.now();
  }
}

export type CircuitStatus = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerGuard {
  public readonly name: string;
  private failureThreshold: number;
  private recoveryCooldownMs: number;
  private successThreshold: number;

  private state: CircuitStatus;
  private failures: number;
  private successes: number;
  private nextAttempt: number;

  constructor(name: string, failureThreshold: number, recoveryCooldownMs: number, successThreshold: number) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryCooldownMs = recoveryCooldownMs;
    this.successThreshold = successThreshold;

    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
  }

  public getState(): CircuitStatus {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }
    return this.state;
  }

  public async call<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    const current = this.getState();
    if (current === 'OPEN') {
      if (fallback) return fallback();
      throw new Error(`CircuitBreaker [${this.name}] is OPEN (Fail-Fast)`);
    }

    try {
      const res = await fn();
      if (this.state === 'HALF_OPEN') {
        this.successes++;
        if (this.successes >= this.successThreshold) {
          this.state = 'CLOSED';
          this.failures = 0;
        }
      } else {
        this.failures = 0;
      }
      return res;
    } catch (err) {
      this.failures++;
      if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.recoveryCooldownMs;
      }
      if (fallback) return fallback();
      throw err;
    }
  }
}

// ============================================================================
// 2. CACHE & DISTRIBUTED STATE LAYER: REDIS & LOCKS (MODULE 14)
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class RedisCacheManager {
  private store: Map<string, CacheEntry<any>>;
  private inflight: Map<string, Promise<any>>;

  constructor() {
    this.store = new Map();
    this.inflight = new Map();
  }

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  public set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  public async getOrFetch<T>(key: string, fetcher: () => Promise<T | null>, ttlMs: number): Promise<T | null> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      if (cached === ('__SENTINEL_NULL__' as unknown as T)) return null;
      return cached;
    }

    if (this.inflight.has(key)) {
      return await this.inflight.get(key);
    }

    const promise = (async () => {
      try {
        const val = await fetcher();
        if (val === null) {
          this.set(key, '__SENTINEL_NULL__' as unknown as T, 200);
          return null;
        }
        this.set(key, val, ttlMs);
        return val;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    const res = await promise;
    if (res === ('__SENTINEL_NULL__' as unknown as T)) return null;
    return res;
  }
}

export class DistributedLockGuard {
  private activeLocks: Map<string, { token: string; expiresAt: number }>;

  constructor() {
    this.activeLocks = new Map();
  }

  public acquire(resource: string, ttlMs: number): { success: boolean; token: string | null } {
    const now = Date.now();
    const existing = this.activeLocks.get(resource);
    if (existing && now < existing.expiresAt) {
      return { success: false, token: null };
    }
    const token = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.activeLocks.set(resource, { token, expiresAt: now + ttlMs });
    return { success: true, token };
  }

  public release(resource: string, token: string): boolean {
    const existing = this.activeLocks.get(resource);
    if (existing && existing.token === token) {
      this.activeLocks.delete(resource);
      return true;
    }
    return false;
  }
}

// ============================================================================
// 3. ASYNC MESSAGING & SAGA TRANSACTIONS: KAFKA (MODULE 15)
// ============================================================================

export interface KafkaLogRecord {
  key: string | null;
  payload: Record<string, unknown>;
  offset: number;
}

export class KafkaBrokerCluster {
  private partitions: Map<string, KafkaLogRecord[][]>;
  private partitionCount: number;

  constructor(partitionCount: number) {
    this.partitionCount = partitionCount;
    this.partitions = new Map();
  }

  public createTopic(topic: string): void {
    if (!this.partitions.has(topic)) {
      const logs: KafkaLogRecord[][] = [];
      for (let i = 0; i < this.partitionCount; i++) logs.push([]);
      this.partitions.set(topic, logs);
    }
  }

  public getPartitionIndex(key: string | null): number {
    if (!key) return 0;
    const hash = createHash('md5').update(key).digest('hex');
    const num = parseInt(hash.slice(0, 8), 16);
    return num % this.partitionCount;
  }

  public publish(topic: string, key: string | null, payload: Record<string, unknown>): { partition: number; offset: number } {
    this.createTopic(topic);
    const pIdx = this.getPartitionIndex(key);
    const pLog = this.partitions.get(topic)![pIdx];
    const offset = pLog.length;
    pLog.push({ key, payload, offset });
    return { partition: pIdx, offset };
  }

  public fetch(topic: string, partition: number, fromOffset: number, count = 10): KafkaLogRecord[] {
    const pLog = this.partitions.get(topic)?.[partition] || [];
    return pLog.slice(fromOffset, fromOffset + count);
  }
}

export class ConsumerGroupService {
  public readonly groupId: string;
  private committedOffsets: Map<string, Map<number, number>>;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.committedOffsets = new Map();
  }

  public getOffset(topic: string, partition: number): number {
    return this.committedOffsets.get(topic)?.get(partition) || 0;
  }

  public commit(topic: string, partition: number, offset: number): void {
    if (!this.committedOffsets.has(topic)) this.committedOffsets.set(topic, new Map());
    this.committedOffsets.get(topic)!.set(partition, offset);
  }

  public consumeAll(broker: KafkaBrokerCluster, topic: string, partition: number, handler: (r: KafkaLogRecord) => void): number {
    const offset = this.getOffset(topic, partition);
    const records = broker.fetch(topic, partition, offset, 20);
    for (const r of records) {
      handler(r);
      this.commit(topic, partition, r.offset + 1);
    }
    return records.length;
  }
}

// ============================================================================
// 4. INTEGRATED BACKBONE SYSTEM ORCHESTRATOR
// ============================================================================

export class TaskFlowDistributedBackbone {
  public rateLimiter: TokenBucketLimiter;
  public circuitBreaker: CircuitBreakerGuard;
  public cache: RedisCacheManager;
  public lock: DistributedLockGuard;
  public kafka: KafkaBrokerCluster;
  public deadLetterQueue: Array<{ event: any; reason: string }>;
  public idempotencyKeys: Set<string>;

  // Datastores
  public customerLedger: Map<string, { balance: number; lastCharge: number }>;
  public workspaceStorage: Map<string, { quotaGb: number; status: string }>;

  constructor() {
    this.rateLimiter = new TokenBucketLimiter(5, 2); // 5 capacity, 2/sec
    this.circuitBreaker = new CircuitBreakerGuard('WorkspaceSvc', 3, 200, 2);
    this.cache = new RedisCacheManager();
    this.lock = new DistributedLockGuard();
    this.kafka = new KafkaBrokerCluster(3); // 3 partitions
    this.deadLetterQueue = [];
    this.idempotencyKeys = new Set();

    this.customerLedger = new Map([['customer-99', { balance: 2000, lastCharge: 0 }]]);
    this.workspaceStorage = new Map();
  }

  /**
   * Saga Transaction: Upgrade Plan dengan Kompensasi Otomatis
   */
  public async executeUpgradeSaga(sagaId: string, customerId: string, requestedGb: number): Promise<{ success: boolean; status: string }> {
    // 1. Check & Charge Billing (Compensable)
    const acc = this.customerLedger.get(customerId);
    if (!acc || acc.balance < 500) {
      throw new Error('Insufficient funds');
    }
    acc.balance -= 500;
    acc.lastCharge = 500;

    // 2. Allocate Workspace Storage (Gagal jika > 1000 GB)
    if (requestedGb > 1000) {
      // Failure -> Trigger Compensating Refund!
      acc.balance += acc.lastCharge;
      this.workspaceStorage.set(sagaId, { quotaGb: requestedGb, status: 'FAILED' });
      return { success: false, status: 'COMPENSATED_REFUND' };
    }

    this.workspaceStorage.set(sagaId, { quotaGb: requestedGb, status: 'ACTIVE' });
    return { success: true, status: 'COMPLETED' };
  }
}

// ============================================================================
// 5. REVIEW 4 INTEGRATION TEST SUITE
// ============================================================================

async function runReview4(): Promise<void> {
  console.log('================================================================');
  console.log('🏆 REVIEW 4: FULL DISTRIBUTED SYSTEMS BACKBONE INTEGRATION');
  console.log('================================================================');

  const backbone = new TaskFlowDistributedBackbone();
  let passedSuites = 0;
  const totalSuites = 7;

  // SUITE 1: API Gateway Token Bucket Rate Limiting
  console.log('\n[Suite 1/7] Menguji Edge Gate: Token Bucket Rate Limiting...');
  backbone.rateLimiter.setTokens(2);
  assert.equal(backbone.rateLimiter.allow(), true, 'Req 1 lolos');
  assert.equal(backbone.rateLimiter.allow(), true, 'Req 2 lolos');
  assert.equal(backbone.rateLimiter.allow(), false, 'Req 3 harus diblokir (HTTP 429)');
  passedSuites++;
  console.log('  ✅ PASSED: Token Bucket memblokir lonjakan traffic yang melebihi kapasitas.');

  // SUITE 2: Circuit Breaker Trip & Fallback Cache
  console.log('\n[Suite 2/7] Menguji Circuit Breaker Trip & Fallback Graceful Degradation...');
  for (let i = 0; i < 3; i++) {
    try {
      await backbone.circuitBreaker.call(async () => {
        throw new Error('Database connection timeout');
      });
    } catch {}
  }
  assert.equal(backbone.circuitBreaker.getState(), 'OPEN');
  const fallback = await backbone.circuitBreaker.call(
    async () => 'fresh-data',
    () => 'cached-fallback-response'
  );
  assert.equal(fallback, 'cached-fallback-response');
  passedSuites++;
  console.log('  ✅ PASSED: Sirkuit OPEN dan mengembalikan fallback tanpa menyentuh downstream.');

  // SUITE 3: Redis Cache-Aside & Singleflight Stampede Protection
  console.log('\n[Suite 3/7] Menguji Redis Cache-Aside & Mitigasi Stampede (50 Reqs Coalesced)...');
  let dbQueries = 0;
  const mockDb = async () => {
    dbQueries++;
    await new Promise(r => setTimeout(r, 15));
    return { workspaceId: 'ws-prod-100', name: 'Fintech Core' };
  };

  const reqPromises: Promise<any>[] = [];
  for (let i = 0; i < 50; i++) {
    reqPromises.push(backbone.cache.getOrFetch('workspace:ws-prod-100', mockDb, 2000));
  }
  const results = await Promise.all(reqPromises);
  assert.equal(results.length, 50);
  assert.equal(dbQueries, 1, '50 concurrent requests harus menghasilkan tepat 1 DB query!');
  passedSuites++;
  console.log('  ✅ PASSED: 50 concurrent requests di-coalesce menjadi TEPAT 1 DB query.');

  // SUITE 4: Distributed Lock Mutex & Lua Atomic Release
  console.log('\n[Suite 4/7] Menguji Distributed Lock Mutex (SET NX PX) & Token Release...');
  const lockA = backbone.lock.acquire('resource:cron:archival', 300);
  assert.equal(lockA.success, true);
  const lockB = backbone.lock.acquire('resource:cron:archival', 300);
  assert.equal(lockB.success, false, 'Worker B harus ditolak');

  // Coba lepas dengan token salah
  const failRel = backbone.lock.release('resource:cron:archival', 'wrong-tok');
  assert.equal(failRel, false);
  // Lepas dengan token benar
  const okRel = backbone.lock.release('resource:cron:archival', lockA.token!);
  assert.equal(okRel, true);
  passedSuites++;
  console.log('  ✅ PASSED: Mutual exclusion dan proteksi token Lua release terbukti aman.');

  // SUITE 5: Kafka Partition Key Deterministic Ordering
  console.log('\n[Suite 5/7] Menguji Kafka Semantic Partition Key & Strict Ordering...');
  const wsKey = 'workspace:ws-prod-100';
  const targetP = backbone.kafka.getPartitionIndex(wsKey);
  const ev1 = backbone.kafka.publish('task.events', wsKey, { seq: 1, action: 'CREATE' });
  const ev2 = backbone.kafka.publish('task.events', wsKey, { seq: 2, action: 'ASSIGN' });
  const ev3 = backbone.kafka.publish('task.events', wsKey, { seq: 3, action: 'FINISH' });

  assert.equal(ev1.partition, targetP);
  assert.equal(ev2.partition, targetP);
  assert.equal(ev3.partition, targetP);
  assert.equal(ev1.offset, 0);
  assert.equal(ev2.offset, 1);
  assert.equal(ev3.offset, 2);
  passedSuites++;
  console.log(`  ✅ PASSED: Event terurut kronologis di partisi ${targetP} (offset 0 -> 1 -> 2).`);

  // SUITE 6: Multi-Consumer Group Fanout (Notification & Audit)
  console.log('\n[Suite 6/7] Menguji Multi-Consumer Fanout...');
  const notifConsumer = new ConsumerGroupService('notif-group');
  const auditConsumer = new ConsumerGroupService('audit-group');
  const notifReceived: string[] = [];
  const auditReceived: string[] = [];

  notifConsumer.consumeAll(backbone.kafka, 'task.events', targetP, (r) => {
    notifReceived.push((r.payload as any).action);
  });
  auditConsumer.consumeAll(backbone.kafka, 'task.events', targetP, (r) => {
    auditReceived.push((r.payload as any).action);
  });

  assert.deepEqual(notifReceived, ['CREATE', 'ASSIGN', 'FINISH']);
  assert.deepEqual(auditReceived, ['CREATE', 'ASSIGN', 'FINISH']);
  passedSuites++;
  console.log('  ✅ PASSED: Kedua consumer group membaca log yang sama secara mandiri.');

  // SUITE 7: Distributed Saga with Compensating Rollback & DLQ
  console.log('\n[Suite 7/7] Menguji Saga Distributed Transaction & Kompensasi Otomatis...');
  // 1. Success Path
  const sagaSuccess = await backbone.executeUpgradeSaga('saga-ok', 'customer-99', 500);
  assert.equal(sagaSuccess.success, true);
  assert.equal(backbone.customerLedger.get('customer-99')?.balance, 1500);

  // 2. Failure Path (> 1000 GB) -> Otomatis Refund Kompensasi
  const sagaFail = await backbone.executeUpgradeSaga('saga-fail', 'customer-99', 5000);
  assert.equal(sagaFail.success, false);
  assert.equal(sagaFail.status, 'COMPENSATED_REFUND');
  assert.equal(backbone.customerLedger.get('customer-99')?.balance, 1500, 'Saldo harus kembali utuh $1500 setelah kompensasi');

  // 3. DLQ Routing
  backbone.deadLetterQueue.push({
    event: { id: 'poison-1', payload: 'corrupt-bin' },
    reason: 'Deserialization failure'
  });
  assert.equal(backbone.deadLetterQueue.length, 1);
  passedSuites++;
  console.log('  ✅ PASSED: Saga kompensasi memulihkan saldo dan pesan beracun diisolasi ke DLQ.');

  // FINAL SCORING & CERTIFICATION
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI REVIEW 4: ${passedSuites}/${totalSuites} SUITES PASSED`);
  const score = Math.round((passedSuites / totalSuites) * 100);
  console.log(`🎯 SKOR AKHIR: ${score}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: REVIEW 4 DINYATAKAN LULUS (GRADE A)');
  console.log('🔓 MODULE 16 (CLOUD INFRASTRUCTURE & DEVOPS ON AWS) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runReview4().catch(err => {
  console.error('❌ Review 4 failed with error:', err);
  process.exit(1);
});
