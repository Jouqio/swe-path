/**
 * level-3-advanced/project-3-distributed-taskflow/test/project-3.test.ts
 *
 * PROJECT 3 CAPSTONE TEST SUITE:
 * High-Throughput Distributed TaskFlow Platform
 *
 * Verifies End-to-End:
 * 1. Edge API Gateway (Token Bucket, Circuit Breaker, W3C Trace Context)
 * 2. In-Memory Redis Caching (Cache-Aside, Singleflight Stampede Defense, Null Caching)
 * 3. Distributed Locks (SET NX PX with Token-Matching Lua Release)
 * 4. Kafka Event Streaming (Deterministic Hashing, Partition Ordering, Multi-Consumer Fanout)
 * 5. Saga Choreography (Forward Transactions, Compensating Refund Rollback, Idempotency)
 * 6. Poison Pill Defense & Dead Letter Queue (DLQ)
 * 7. SRE Observability (Percentiles P50/P90/P99, SLI/SLO, Error Budget, Multi-Burn Alerting)
 *
 * Execution: node --experimental-strip-types "level-3-advanced\project-3-distributed-taskflow\test\project-3.test.ts"
 */

import assert from 'node:assert/strict';
import { EdgeRateLimiter, EdgeCircuitBreaker, EdgeW3CTracer } from '../src/gateway/edge-gateway.ts';
import { DistributedCacheService, DistributedLockService } from '../src/cache/distributed-cache.ts';
import { KafkaTopicCluster, KafkaConsumerGroup } from '../src/events/event-backbone.ts';
import { TaskFlowSagaCoordinator } from '../src/saga/saga-coordinator.ts';
import { SREObservabilityCollector } from '../src/sre/observability-engine.ts';

async function runProject3TestSuite(): Promise<void> {
  console.log('================================================================');
  console.log('🏆 PROJECT 3 CAPSTONE TEST SUITE: DISTRIBUTED TASKFLOW PLATFORM');
  console.log('================================================================');

  let passedSuites = 0;
  const totalSuites = 7;

  // --------------------------------------------------------------------------
  // SUITE 1: EDGE GATEWAY, RATE LIMITER & CIRCUIT BREAKER
  // --------------------------------------------------------------------------
  console.log('\n[Suite 1/7] Menguji Edge Gateway (Rate Limiter, Circuit Breaker, W3C Tracing)...');
  const rateLimiter = new EdgeRateLimiter(3, 1); // Kapasitas 3
  rateLimiter.setTokens(3);
  assert.equal(rateLimiter.allowRequest(), true);
  assert.equal(rateLimiter.allowRequest(), true);
  assert.equal(rateLimiter.allowRequest(), true);
  assert.equal(rateLimiter.allowRequest(), false, 'Request ke-4 harus diblokir oleh Token Bucket (HTTP 429)');

  // W3C Trace Context
  const traceparent = EdgeW3CTracer.createTraceparent();
  const parsedTrace = EdgeW3CTracer.parseTraceparent(traceparent);
  assert.notEqual(parsedTrace, null);
  assert.equal(parsedTrace?.sampled, true);

  // Circuit Breaker State Machine
  const breaker = new EdgeCircuitBreaker('TaskServiceDownstream', 3, 200, 2);
  assert.equal(breaker.getState(), 'CLOSED');

  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        throw new Error('Downstream connection timeout');
      });
    } catch {}
  }
  assert.equal(breaker.getState(), 'OPEN');

  // Fallback executed during OPEN
  let downstreamHit = false;
  const fallbackRes = await breaker.execute(
    async () => {
      downstreamHit = true;
      return 'real-data';
    },
    () => 'cached-fallback-response'
  );
  assert.equal(downstreamHit, false);
  assert.equal(fallbackRes, 'cached-fallback-response');

  // Recovery: wait 220ms -> HALF_OPEN -> 2 probes -> CLOSED
  await new Promise(r => setTimeout(r, 220));
  assert.equal(breaker.getState(), 'HALF_OPEN');
  await breaker.execute(async () => 'probe-1');
  assert.equal(breaker.getState(), 'HALF_OPEN');
  await breaker.execute(async () => 'probe-2');
  assert.equal(breaker.getState(), 'CLOSED');
  passedSuites++;
  console.log('  ✅ PASSED: Edge Gateway (Token Bucket, W3C Context, Circuit Breaker State Machine) 100% OK.');

  // --------------------------------------------------------------------------
  // SUITE 2: IN-MEMORY REDIS CACHE-ASIDE & STAMPEDE / PENETRATION MITIGATION
  // --------------------------------------------------------------------------
  console.log('\n[Suite 2/7] Menguji Redis Cache-Aside & Mitigasi Stampede / Penetrasi...');
  const cache = new DistributedCacheService();
  let dbQueries = 0;
  const mockFetch = async () => {
    dbQueries++;
    await new Promise(r => setTimeout(r, 20));
    return { workspaceId: 'ws-enterprise-99', tier: 'ENTERPRISE' };
  };

  // Stampede: 50 concurrent requests
  const concurrentPromises: Promise<any>[] = [];
  for (let i = 0; i < 50; i++) {
    concurrentPromises.push(cache.getOrLoad('workspace:ws-enterprise-99', mockFetch, 2000));
  }
  const results = await Promise.all(concurrentPromises);
  assert.equal(results.length, 50);
  assert.equal(dbQueries, 1, '50 concurrent requests harus di-coalesce menjadi TEPAT 1 DB Query!');

  // Penetration: Non-existent ID cached as sentinel
  let fakeDbHits = 0;
  const fakeFetch = async () => {
    fakeDbHits++;
    return null;
  };
  const fakeResult = await cache.getOrLoad('workspace:non-existent', fakeFetch, 500);
  assert.equal(fakeResult, null);
  assert.equal(fakeDbHits, 1);

  // 10 subsequent queries must hit sentinel without database query
  for (let i = 0; i < 10; i++) {
    const f = await cache.getOrLoad('workspace:non-existent', fakeFetch, 500);
    assert.equal(f, null);
  }
  assert.equal(fakeDbHits, 1, 'Query ID fiktif berikutnya harus diblokir oleh sentinel cache!');
  passedSuites++;
  console.log('  ✅ PASSED: Cache-Aside, Singleflight Stampede Defense, dan Sentinel Null Caching terbukti.');

  // --------------------------------------------------------------------------
  // SUITE 3: DISTRIBUTED LOCKS WITH LUA TOKEN ATOMIC RELEASE
  // --------------------------------------------------------------------------
  console.log('\n[Suite 3/7] Menguji Distributed Mutex Locks (SET NX PX & Lua Release)...');
  const lockService = new DistributedLockService();

  const worker1 = lockService.acquire('resource:cron:archival', 300);
  assert.equal(worker1.success, true);
  assert.notEqual(worker1.token, null);

  const worker2 = lockService.acquire('resource:cron:archival', 300);
  assert.equal(worker2.success, false, 'Worker 2 harus ditolak (Resource sedang terkunci)');

  // Token mismatch rejection
  const falseRelease = lockService.release('resource:cron:archival', 'fake-token');
  assert.equal(falseRelease, false);

  // Valid token release
  const validRelease = lockService.release('resource:cron:archival', worker1.token!);
  assert.equal(validRelease, true);

  // Worker 2 can now acquire
  const worker2Retry = lockService.acquire('resource:cron:archival', 300);
  assert.equal(worker2Retry.success, true);
  passedSuites++;
  console.log('  ✅ PASSED: Distributed Lock mutual exclusion dan pelepasan berbasis token terverifikasi.');

  // --------------------------------------------------------------------------
  // SUITE 4: KAFKA EVENT STREAMING & STRICT SEQUENTIAL ORDERING
  // --------------------------------------------------------------------------
  console.log('\n[Suite 4/7] Menguji Kafka Event Streaming & Strict Ordering per Workspace...');
  const kafkaTopic = new KafkaTopicCluster('taskflow.production.events', 3);
  const targetWsKey = 'workspace:fintech-core-888';
  const targetPartition = kafkaTopic.computePartition(targetWsKey);

  const e1 = kafkaTopic.produce(targetWsKey, { seq: 1, action: 'CREATE_TASK' });
  const e2 = kafkaTopic.produce(targetWsKey, { seq: 2, action: 'ASSIGN_ENGINEER' });
  const e3 = kafkaTopic.produce(targetWsKey, { seq: 3, action: 'CLOSE_TASK' });

  assert.equal(e1.partition, targetPartition);
  assert.equal(e2.partition, targetPartition);
  assert.equal(e3.partition, targetPartition);
  assert.equal(e1.offset, 0);
  assert.equal(e2.offset, 1);
  assert.equal(e3.offset, 2);

  // Multi-consumer fanout
  const notifConsumer = new KafkaConsumerGroup('notification-service');
  const auditConsumer = new KafkaConsumerGroup('audit-service');
  const notifEvents: string[] = [];
  const auditEvents: string[] = [];

  notifConsumer.poll(kafkaTopic, targetPartition, (env) => {
    notifEvents.push((env.payload as any).action);
  });
  auditConsumer.poll(kafkaTopic, targetPartition, (env) => {
    auditEvents.push((env.payload as any).action);
  });

  assert.deepEqual(notifEvents, ['CREATE_TASK', 'ASSIGN_ENGINEER', 'CLOSE_TASK']);
  assert.deepEqual(auditEvents, ['CREATE_TASK', 'ASSIGN_ENGINEER', 'CLOSE_TASK']);
  assert.equal(notifConsumer.getOffset(targetPartition), 3);
  assert.equal(auditConsumer.getOffset(targetPartition), 3);
  passedSuites++;
  console.log('  ✅ PASSED: Strict sequential ordering dan multi-consumer fanout terbukti 100%.');

  // --------------------------------------------------------------------------
  // SUITE 5: SAGA DISTRIBUTED TRANSACTIONS WITH COMPENSATING REFUND
  // --------------------------------------------------------------------------
  console.log('\n[Suite 5/7] Menguji Saga Distributed Transactions & Kompensasi Otomatis...');
  const saga = new TaskFlowSagaCoordinator();

  // 1. Happy Path: 500 GB Storage Allocation
  const charge1 = await saga.debitCustomerAccount('saga-001', 'cust-100', 500);
  assert.equal(charge1.step, 'BILLING_DEBITED');
  assert.equal(saga.customerBalances.get('cust-100')?.balance, 2000);

  const quota1 = await saga.allocateStorageQuota(charge1, 500);
  assert.equal(quota1.step, 'QUOTA_ALLOCATED');
  assert.equal(saga.workspaceQuotas.get('saga-001')?.status, 'ACTIVE');

  // Idempotency: re-delivery of charge1 does not re-allocate
  const duplicateQuota = await saga.allocateStorageQuota(charge1, 500);
  assert.equal(duplicateQuota.step, 'SKIPPED_IDEMPOTENT');

  // 2. Failure Path: 5000 GB Storage Allocation (> 1000 GB limit)
  const charge2 = await saga.debitCustomerAccount('saga-002', 'cust-100', 500);
  assert.equal(saga.customerBalances.get('cust-100')?.balance, 1500);

  const quotaFail = await saga.allocateStorageQuota(charge2, 5000);
  assert.equal(quotaFail.step, 'QUOTA_ALLOCATION_FAILED');
  assert.equal(saga.workspaceQuotas.get('saga-002')?.status, 'FAILED');

  // Compensating Transaction
  const refund = await saga.refundCustomerAccount(quotaFail, 'cust-100');
  assert.equal(refund.step, 'BILLING_REFUNDED');
  assert.equal(saga.customerBalances.get('cust-100')?.balance, 2000, 'Saldo harus kembali utuh $2000 setelah kompensasi');
  passedSuites++;
  console.log('  ✅ PASSED: Saga transaksi maju, proteksi idempotensi, dan kompensasi refund berhasil.');

  // --------------------------------------------------------------------------
  // SUITE 6: POISON PILL DEFENSE & DEAD LETTER QUEUE (DLQ)
  // --------------------------------------------------------------------------
  console.log('\n[Suite 6/7] Menguji Poison Pill Defense & Dead Letter Queue (DLQ)...');
  const corruptPayload = {
    sagaId: 'saga-poison-999',
    step: 'WORKSPACE_QUOTA',
    payload: { brokenEncoding: '\u0000\u0001\uffff' }
  };

  saga.pushToDlq(corruptPayload, 'Malformed payload encoding detected after 3 retries');
  assert.equal(saga.dlqRecords.length, 1);
  assert.equal(saga.dlqRecords[0].event.sagaId, 'saga-poison-999');
  assert.ok(saga.dlqRecords[0].reason.includes('Malformed payload'));
  passedSuites++;
  console.log('  ✅ PASSED: Pesan rusak sukses diisolasi ke DLQ tanpa menyandera partisi aktif.');

  // --------------------------------------------------------------------------
  // SUITE 7: SRE METRICS, LATENCY PERCENTILES & MULTI-BURN-RATE ALERTING
  // --------------------------------------------------------------------------
  console.log('\n[Suite 7/7] Menguji SRE Observability (Percentiles, SLI/SLO, Burn Rate Alerting)...');
  const sre = new SREObservabilityCollector(0.999); // 99.9% SLO

  // 1. Latency Percentiles (p50, p90, p99)
  for (let i = 0; i < 90; i++) sre.recordLatency(18); // 90 cepat (18ms)
  for (let i = 0; i < 9; i++) sre.recordLatency(120); // 9 sedang (120ms)
  sre.recordLatency(4200); // 1 outlier (4.2 detik)

  const pct = sre.getPercentiles();
  assert.equal(pct.p50, 18);
  assert.equal(pct.p90, 120);
  assert.equal(pct.p99, 4200);

  // 2. SLI Calculation
  const sli = sre.computeSLI(9995, 10000);
  assert.equal(sli, 0.9995);

  // 3. Error Budget & Deployment Freeze Policy
  const budgetNormal = sre.computeErrorBudget(10_000_000, 3000);
  assert.equal(budgetNormal.remainingPct, 70.0);
  assert.equal(budgetNormal.isFreezeActive, false);

  const budgetExhausted = sre.computeErrorBudget(10_000_000, 15000);
  assert.equal(budgetExhausted.remainingPct, 0);
  assert.equal(budgetExhausted.isFreezeActive, true, 'Deployment freeze wajib aktif saat budget habis');

  // 4. Multi-Window Multi-Burn-Rate Alerting
  const falseSpike = sre.checkMultiBurnRateAlert(50, 100000, 20, 1000);
  assert.equal(falseSpike.shouldPage, false, 'False positive spike tidak boleh memicu pager');

  const trueDisaster = sre.checkMultiBurnRateAlert(200, 10000, 20, 1000);
  assert.equal(trueDisaster.shouldPage, true);
  assert.equal(trueDisaster.severity, 'PAGE');
  passedSuites++;
  console.log('  ✅ PASSED: SRE Observability (P50/P90/P99, SLI/SLO, Deployment Freeze & Alerting) 100% OK.');

  // --------------------------------------------------------------------------
  // FINAL EVALUATION
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI PROJECT 3 CAPSTONE: ${passedSuites}/${totalSuites} SUITES PASSED`);
  const finalScore = Math.round((passedSuites / totalSuites) * 100);
  console.log(`🎯 SKOR AKHIR: ${finalScore}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: PROJECT 3 CAPSTONE DINYATAKAN LULUS (GRADE A)!');
  console.log('🔓 FINAL GATE 3 (SENIOR SOFTWARE ENGINEER CERTIFICATION) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runProject3TestSuite().catch(err => {
  console.error('❌ Project 3 Capstone Test failed with error:', err);
  process.exit(1);
});
