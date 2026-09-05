/**
 * assessment-module-13.ts
 *
 * Automated Practical Assessment Suite for Module 13:
 * System Design, Distributed Quorum, Outbox Pattern, Circuit Breaker & API Gateway
 *
 * Execution: node --experimental-strip-types assessment-module-13.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. REPLICA NODE & QUORUM CONSISTENCY IMPLEMENTATION
// ============================================================================

export interface StorageRecord {
  key: string;
  value: string;
  version: number;
}

export class ReplicaClusterNode {
  public readonly id: string;
  public isPartitioned: boolean;
  private storage: Map<string, StorageRecord>;

  constructor(id: string) {
    this.id = id;
    this.isPartitioned = false;
    this.storage = new Map();
  }

  public write(record: StorageRecord): boolean {
    if (this.isPartitioned) return false;
    const existing = this.storage.get(record.key);
    if (!existing || record.version >= existing.version) {
      this.storage.set(record.key, { ...record });
      return true;
    }
    return false;
  }

  public read(key: string): StorageRecord | null {
    if (this.isPartitioned) return null;
    return this.storage.get(key) || null;
  }
}

export class QuorumCluster {
  private nodes: ReplicaClusterNode[];

  constructor(nodeCount: number) {
    this.nodes = [];
    for (let i = 1; i <= nodeCount; i++) {
      this.nodes.push(new ReplicaClusterNode(`node-${i}`));
    }
  }

  public getNodes(): ReplicaClusterNode[] {
    return this.nodes;
  }

  public write(key: string, value: string, version: number, W: number): { success: boolean; acks: number } {
    const record: StorageRecord = { key, value, version };
    let acks = 0;
    for (const node of this.nodes) {
      if (node.write(record)) acks++;
    }
    return { success: acks >= W, acks };
  }

  public read(key: string, R: number): { value: string | null; version: number; success: boolean } {
    let responses = 0;
    let highest: StorageRecord | null = null;
    for (const node of this.nodes) {
      const res = node.read(key);
      if (res !== null) {
        responses++;
        if (!highest || res.version > highest.version) {
          highest = res;
        }
      }
    }
    if (responses >= R && highest) {
      return { value: highest.value, version: highest.version, success: true };
    }
    return { value: null, version: 0, success: false };
  }

  public partitionNodes(ids: string[]): void {
    for (const node of this.nodes) {
      if (ids.includes(node.id)) node.isPartitioned = true;
    }
  }

  public healAll(): void {
    for (const node of this.nodes) node.isPartitioned = false;
  }
}

// ============================================================================
// 2. TRANSACTIONAL OUTBOX & IDEMPOTENCY IMPLEMENTATION
// ============================================================================

export interface OutboxItem {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  published: boolean;
}

export class TaskServiceOutbox {
  private tasks: Map<string, any> = new Map();
  private outbox: OutboxItem[] = [];

  public createTask(id: string, title: string, creatorId: string): { task: any; event: OutboxItem } {
    const task = { id, title, creatorId, status: 'CREATED' };
    const event: OutboxItem = {
      id: `evt-${id}-${Date.now()}`,
      aggregateId: id,
      eventType: 'TASK_CREATED',
      payload: { taskId: id, title, creatorId },
      published: false
    };

    // Atomic mutation dalam local boundary
    this.tasks.set(id, task);
    this.outbox.push(event);

    return { task, event };
  }

  public getPendingEvents(): OutboxItem[] {
    return this.outbox.filter(e => !e.published);
  }

  public markPublished(id: string): void {
    const evt = this.outbox.find(e => e.id === id);
    if (evt) evt.published = true;
  }
}

export class IdempotentAuditConsumer {
  public processedIds: Set<string> = new Set();
  public auditLogs: string[] = [];

  public consume(event: OutboxItem): boolean {
    if (this.processedIds.has(event.id)) {
      return false; // Skip duplicate
    }
    this.processedIds.add(event.id);
    this.auditLogs.push(`AUDIT: Event [${event.eventType}] for aggregate [${event.aggregateId}] processed.`);
    return true;
  }
}

// ============================================================================
// 3. CIRCUIT BREAKER WITH FINITE STATE MACHINE
// ============================================================================

export type CircuitStatus = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerEngine {
  public readonly name: string;
  private failureThreshold: number;
  private recoveryTimeoutMs: number;
  private successThreshold: number;

  private state: CircuitStatus;
  private failureCount: number;
  private successCount: number;
  private nextAttemptTimestamp: number;

  constructor(name: string, failureThreshold: number, recoveryTimeoutMs: number, successThreshold: number) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeoutMs = recoveryTimeoutMs;
    this.successThreshold = successThreshold;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTimestamp = Date.now();
  }

  public getState(): CircuitStatus {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTimestamp) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
    return this.state;
  }

  public async call<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      if (fallback) return fallback();
      throw new Error(`CircuitBreaker [${this.name}] is OPEN - Fast Fail`);
    }

    try {
      const res = await action();
      this.recordSuccess();
      return res;
    } catch (err) {
      this.recordFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  private recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTimestamp = Date.now() + this.recoveryTimeoutMs;
    }
  }
}

// ============================================================================
// 4. TOKEN BUCKET RATE LIMITER
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
    const added = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + added);
    this.lastRefill = now;
  }

  public consume(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public setTokens(count: number): void {
    this.tokens = count;
    this.lastRefill = Date.now();
  }
}

// ============================================================================
// 5. LOAD BALANCER
// ============================================================================

export interface BackendTarget {
  id: string;
  isAlive: boolean;
}

export class LoadBalancer {
  private backends: BackendTarget[];
  private pointer: number;

  constructor(backends: BackendTarget[]) {
    this.backends = backends;
    this.pointer = 0;
  }

  public pick(): BackendTarget | null {
    const alive = this.backends.filter(b => b.isAlive);
    if (alive.length === 0) return null;
    const chosen = alive[this.pointer % alive.length];
    this.pointer = (this.pointer + 1) % alive.length;
    return chosen;
  }

  public markAlive(id: string, alive: boolean): void {
    const t = this.backends.find(b => b.id === id);
    if (t) t.isAlive = alive;
  }
}

// ============================================================================
// 6. MASTER ASSESSMENT EXECUTION
// ============================================================================

async function runModule13Assessment(): Promise<void> {
  console.log('================================================================');
  console.log('🎓 MODULE 13 ASSESSMENT: SYSTEM DESIGN & MICROSERVICES');
  console.log('================================================================');

  let passedTests = 0;
  const totalTests = 6;

  // TEST 1: Distributed Quorum Consistency (W + R > N)
  console.log('\n[Suite 1/6] Menguji Quorum Consistency & Strong Linearizability...');
  const cluster = new QuorumCluster(5);
  // N=5, W=3, R=3 -> W+R = 6 > 5
  const w1 = cluster.write('task:1:title', 'Design Microservices', 1, 3);
  assert.equal(w1.success, true);
  assert.equal(w1.acks, 5);

  const r1 = cluster.read('task:1:title', 3);
  assert.equal(r1.success, true);
  assert.equal(r1.value, 'Design Microservices');
  assert.equal(r1.version, 1);
  passedTests++;
  console.log('  ✅ PASSED: Strong Quorum terverifikasi (5 acks, data versi mutakhir terbaca).');

  // TEST 2: Network Partition Tolerance & CP Safety
  console.log('\n[Suite 2/6] Menguji Perilaku CP saat Terjadi Network Partition...');
  // 3 node mati (node-1, node-2, node-3), tersisa 2 node
  cluster.partitionNodes(['node-1', 'node-2', 'node-3']);
  const w2 = cluster.write('task:1:title', 'Split Brain Attack', 2, 3);
  // Harus ditolak demi CP safety karena acks (2) < W (3)
  assert.equal(w2.success, false);
  assert.equal(w2.acks, 2);

  const r2 = cluster.read('task:1:title', 3);
  // Read juga gagal karena respons (2) < R (3)
  assert.equal(r2.success, false);

  cluster.healAll(); // Pemulihan
  passedTests++;
  console.log('  ✅ PASSED: CP safety terverifikasi (Write & Read ditolak saat kuorum tidak terpenuhi).');

  // TEST 3: Transactional Outbox Pattern & Idempotent Consumer
  console.log('\n[Suite 3/6] Menguji Transactional Outbox & Idempotency...');
  const taskService = new TaskServiceOutbox();
  const consumer = new IdempotentAuditConsumer();

  const { task, event } = taskService.createTask('task-101', 'Setup Redis Cluster', 'dev-1');
  assert.equal(task.id, 'task-101');
  assert.equal(event.aggregateId, 'task-101');
  assert.equal(taskService.getPendingEvents().length, 1);

  // Konsumsi pertama
  const c1 = consumer.consume(event);
  assert.equal(c1, true);
  taskService.markPublished(event.id);
  assert.equal(taskService.getPendingEvents().length, 0);

  // Konsumsi kedua (simulasi network retry ganda)
  const c2 = consumer.consume(event);
  assert.equal(c2, false, 'Consumer harus menolak event duplikat');
  assert.equal(consumer.auditLogs.length, 1, 'Hanya boleh ada 1 audit log');
  passedTests++;
  console.log('  ✅ PASSED: Outbox tersimpan atomik dan consumer menolak duplikasi event.');

  // TEST 4: Token Bucket Rate Limiter
  console.log('\n[Suite 4/6] Menguji Token Bucket Rate Limiter...');
  const limiter = new TokenBucketLimiter(3, 1); // Kapasitas 3, isi 1/detik
  limiter.setTokens(3);

  assert.equal(limiter.consume(), true, 'Request 1 harus lolos');
  assert.equal(limiter.consume(), true, 'Request 2 harus lolos');
  assert.equal(limiter.consume(), true, 'Request 3 harus lolos');
  assert.equal(limiter.consume(), false, 'Request 4 harus diblokir (HTTP 429)');
  passedTests++;
  console.log('  ✅ PASSED: Burst limit 3 tercapai dan request ke-4 diblokir sesuai kapasitas token.');

  // TEST 5: Circuit Breaker Trip & Fallback Execution
  console.log('\n[Suite 5/6] Menguji Circuit Breaker Trip (CLOSED -> OPEN) & Fallback...');
  const breaker = new CircuitBreakerEngine('TaskSvc', 3, 200, 2);
  assert.equal(breaker.getState(), 'CLOSED');

  // Buat 3 kegagalan berturut-turut
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.call(async () => {
        throw new Error('Downstream DB crash');
      });
    } catch {}
  }

  assert.equal(breaker.getState(), 'OPEN');
  // Panggilan saat OPEN harus memanggil fallback tanpa menyentuh downstream
  let downstreamCalled = false;
  const fallbackResult = await breaker.call(
    async () => {
      downstreamCalled = true;
      return 'real-data';
    },
    () => 'fallback-cached-data'
  );
  assert.equal(downstreamCalled, false, 'Downstream tidak boleh dihubungi saat sirkuit OPEN');
  assert.equal(fallbackResult, 'fallback-cached-data');
  passedTests++;
  console.log('  ✅ PASSED: Sirkuit terbuka setelah 3 kegagalan dan fallback dieksekusi fail-fast.');

  // TEST 6: Circuit Breaker Half-Open Recovery & Load Balancing
  console.log('\n[Suite 6/6] Menguji Circuit Breaker Recovery (HALF-OPEN -> CLOSED) & Load Balancer...');
  // Tunggu cooldown 220ms
  await new Promise(r => setTimeout(r, 220));
  assert.equal(breaker.getState(), 'HALF_OPEN');

  // Kirim 2 probe sukses
  await breaker.call(async () => 'probe-1');
  assert.equal(breaker.getState(), 'HALF_OPEN');
  await breaker.call(async () => 'probe-2');
  assert.equal(breaker.getState(), 'CLOSED', 'Sirkuit harus pulih ke CLOSED setelah 2 probe sukses');

  // Uji Load Balancer
  const lb = new LoadBalancer([
    { id: 'instance-a', isAlive: true },
    { id: 'instance-b', isAlive: true },
    { id: 'instance-c', isAlive: false } // instance mati
  ]);
  const p1 = lb.pick();
  const p2 = lb.pick();
  const p3 = lb.pick();
  assert.equal(p1?.id, 'instance-a');
  assert.equal(p2?.id, 'instance-b');
  assert.equal(p3?.id, 'instance-a'); // c dilewati karena mati
  passedTests++;
  console.log('  ✅ PASSED: Pemulihan HALF-OPEN -> CLOSED dan rotasi Load Balancer sehat terbukti.');

  // FINAL SCORING & CERTIFICATION
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI ASSESSMENT MODULE 13: ${passedTests}/${totalTests} SUITES PASSED`);
  const score = Math.round((passedTests / totalTests) * 100);
  console.log(`🎯 SKOR AKHIR: ${score}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: MODULE 13 DINYATAKAN LULUS (GRADE A)');
  console.log('🔓 MODULE 14 (IN-MEMORY CACHING & DISTRIBUTED STATE: REDIS) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runModule13Assessment().catch(err => {
  console.error('❌ Assessment failed with error:', err);
  process.exit(1);
});
