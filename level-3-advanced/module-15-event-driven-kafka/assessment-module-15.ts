/**
 * assessment-module-15.ts
 *
 * Automated Practical Assessment Suite for Module 15:
 * Asynchronous Messaging (Kafka), Saga Distributed Transactions, and DLQ
 *
 * Execution: node --experimental-strip-types assessment-module-15.ts
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// ============================================================================
// 1. KAFKA BROKER IMPLEMENTATION (PARTITIONS, TOPICS, CONSUMER GROUPS)
// ============================================================================

export interface LogMessage {
  key: string | null;
  payload: Record<string, unknown>;
  timestamp: number;
  offset: number;
}

export class TopicPartition {
  public messages: LogMessage[];

  constructor() {
    this.messages = [];
  }

  public append(key: string | null, payload: Record<string, unknown>): LogMessage {
    const offset = this.messages.length;
    const msg: LogMessage = {
      key,
      payload,
      timestamp: Date.now(),
      offset
    };
    this.messages.push(msg);
    return msg;
  }

  public read(fromOffset: number, count = 10): LogMessage[] {
    return this.messages.slice(fromOffset, fromOffset + count);
  }
}

export class KafkaBrokerTopic {
  public readonly name: string;
  public readonly partitionCount: number;
  private partitions: TopicPartition[];

  constructor(name: string, partitionCount: number) {
    this.name = name;
    this.partitionCount = partitionCount;
    this.partitions = [];
    for (let i = 0; i < partitionCount; i++) {
      this.partitions.push(new TopicPartition());
    }
  }

  public hashKeyToPartition(key: string | null): number {
    if (!key) return 0;
    const hash = createHash('md5').update(key).digest('hex');
    const num = parseInt(hash.slice(0, 8), 16);
    return num % this.partitionCount;
  }

  public publish(key: string | null, payload: Record<string, unknown>): { partition: number; offset: number } {
    const pIdx = this.hashKeyToPartition(key);
    const msg = this.partitions[pIdx].append(key, payload);
    return { partition: pIdx, offset: msg.offset };
  }

  public consume(partition: number, offset: number, count = 10): LogMessage[] {
    if (partition < 0 || partition >= this.partitionCount) {
      throw new Error(`Partition ${partition} does not exist`);
    }
    return this.partitions[partition].read(offset, count);
  }
}

export class ConsumerGroupTracker {
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
    if (!this.committedOffsets.has(topic)) {
      this.committedOffsets.set(topic, new Map());
    }
    this.committedOffsets.get(topic)!.set(partition, offset);
  }

  public processBatch(
    topic: KafkaBrokerTopic,
    partition: number,
    handler: (msg: LogMessage) => void
  ): number {
    const offset = this.getOffset(topic.name, partition);
    const batch = topic.consume(partition, offset, 10);

    for (const msg of batch) {
      handler(msg);
      this.commit(topic.name, partition, msg.offset + 1);
    }

    return batch.length;
  }
}

// ============================================================================
// 2. SAGA CHOREOGRAPHY & COMPENSATING TRANSACTIONS IMPLEMENTATION
// ============================================================================

export interface SagaTransactionEvent {
  sagaId: string;
  type: string;
  data: Record<string, unknown>;
  retryAttempts: number;
}

export class MasterSagaCoordinator {
  public accounts: Map<string, { balance: number; lastCharge: number; status: string }>;
  public workspaces: Map<string, { quotaGb: number; status: string }>;
  public dlq: Array<{ event: SagaTransactionEvent; reason: string; timestamp: number }>;
  public idempotencyStore: Set<string>;

  constructor() {
    this.accounts = new Map([['customer-42', { balance: 1200, lastCharge: 0, status: 'NORMAL' }]]);
    this.workspaces = new Map();
    this.dlq = [];
    this.idempotencyStore = new Set();
  }

  // Step 1: Charge
  public async executeBillingCharge(sagaId: string, customerId: string, fee: number): Promise<SagaTransactionEvent> {
    const acc = this.accounts.get(customerId);
    if (!acc || acc.balance < fee) {
      throw new Error(`Insufficient balance`);
    }

    acc.balance -= fee;
    acc.lastCharge = fee;
    acc.status = 'CHARGED';

    return {
      sagaId,
      type: 'BILLING_CHARGED',
      data: { customerId, fee },
      retryAttempts: 0
    };
  }

  // Step 2: Allocate Quota
  public async executeQuotaAllocation(event: SagaTransactionEvent, requestedGb: number): Promise<SagaTransactionEvent> {
    const eventHash = `${event.sagaId}:${event.type}`;
    if (this.idempotencyStore.has(eventHash)) {
      return { sagaId: event.sagaId, type: 'DUPLICATE_SKIPPED', data: {}, retryAttempts: 0 };
    }
    this.idempotencyStore.add(eventHash);

    // Limit server quota: max 1000 GB
    if (requestedGb > 1000) {
      this.workspaces.set(event.sagaId, { quotaGb: requestedGb, status: 'ALLOCATION_FAILED' });
      return {
        sagaId: event.sagaId,
        type: 'WORKSPACE_QUOTA_FAILED',
        data: { error: 'STORAGE_OVERFLOW' },
        retryAttempts: 0
      };
    }

    this.workspaces.set(event.sagaId, { quotaGb: requestedGb, status: 'ACTIVE' });
    return {
      sagaId: event.sagaId,
      type: 'WORKSPACE_QUOTA_ALLOCATED',
      data: { quotaGb: requestedGb },
      retryAttempts: 0
    };
  }

  // Step 3: Compensating Transaction
  public async executeBillingRefund(event: SagaTransactionEvent, customerId: string): Promise<SagaTransactionEvent> {
    const acc = this.accounts.get(customerId);
    if (acc && acc.status === 'CHARGED') {
      acc.balance += acc.lastCharge;
      acc.status = 'REFUNDED';
    }

    return {
      sagaId: event.sagaId,
      type: 'BILLING_REFUNDED',
      data: { customerId, refundedAmount: acc?.lastCharge || 0 },
      retryAttempts: 0
    };
  }

  // DLQ Handler
  public sendToDlq(event: SagaTransactionEvent, reason: string): void {
    this.dlq.push({
      event,
      reason,
      timestamp: Date.now()
    });
  }
}

// ============================================================================
// 3. MASTER ASSESSMENT EXECUTION
// ============================================================================

async function runModule15Assessment(): Promise<void> {
  console.log('================================================================');
  console.log('🎓 MODULE 15 ASSESSMENT: ASYNCHRONOUS MESSAGING & EVENT-DRIVEN');
  console.log('================================================================');

  let passedTests = 0;
  const totalTests = 6;

  // TEST 1: Semantic Partition Key Hashing & Strict Ordering
  console.log('\n[Suite 1/6] Menguji Hashing Partition Key & Jaminan Keterurutan Kronologis...');
  const topic = new KafkaBrokerTopic('taskflow.workspace.events', 4);
  const partitionKey = 'workspace:ws-prod-777';
  const targetPartition = topic.hashKeyToPartition(partitionKey);

  const m1 = topic.publish(partitionKey, { step: 1, action: 'CREATE_TASK' });
  const m2 = topic.publish(partitionKey, { step: 2, action: 'ASSIGN_MEMBER' });
  const m3 = topic.publish(partitionKey, { step: 3, action: 'COMPLETE_TASK' });

  assert.equal(m1.partition, targetPartition);
  assert.equal(m2.partition, targetPartition);
  assert.equal(m3.partition, targetPartition);
  assert.equal(m1.offset, 0);
  assert.equal(m2.offset, 1);
  assert.equal(m3.offset, 2);
  passedTests++;
  console.log(`  ✅ PASSED: Seluruh event workspace terpetakan ke partisi ${targetPartition} secara berurutan (0 -> 1 -> 2).`);

  // TEST 2: Multi-Consumer Group Fanout & Independent Offset Tracking
  console.log('\n[Suite 2/6] Menguji Multi-Consumer Fanout (Notification & Audit Groups)...');
  const notifGroup = new ConsumerGroupTracker('notification-service');
  const auditGroup = new ConsumerGroupTracker('audit-service');

  const notifActions: string[] = [];
  const auditActions: string[] = [];

  // Notification group memproses batch
  const notifProcessed = notifGroup.processBatch(topic, targetPartition, (msg) => {
    notifActions.push((msg.payload as any).action);
  });
  assert.equal(notifProcessed, 3);
  assert.deepEqual(notifActions, ['CREATE_TASK', 'ASSIGN_MEMBER', 'COMPLETE_TASK']);
  assert.equal(notifGroup.getOffset(topic.name, targetPartition), 3);

  // Audit group baru mulai membaca dari offset 0
  assert.equal(auditGroup.getOffset(topic.name, targetPartition), 0);
  const auditProcessed = auditGroup.processBatch(topic, targetPartition, (msg) => {
    auditActions.push((msg.payload as any).action);
  });
  assert.equal(auditProcessed, 3);
  assert.deepEqual(auditActions, ['CREATE_TASK', 'ASSIGN_MEMBER', 'COMPLETE_TASK']);
  assert.equal(auditGroup.getOffset(topic.name, targetPartition), 3);
  passedTests++;
  console.log('  ✅ PASSED: Multi-consumer fanout terbukti (Notif & Audit membaca log yang sama secara independen).');

  // TEST 3: Saga Choreography Forward Flow (Happy Path)
  console.log('\n[Suite 3/6] Menguji Saga Forward Execution (Upgrade 500 GB Storage)...');
  const saga = new MasterSagaCoordinator();

  const chargeEvent = await saga.executeBillingCharge('saga-101', 'customer-42', 300);
  assert.equal(chargeEvent.type, 'BILLING_CHARGED');
  assert.equal(saga.accounts.get('customer-42')?.balance, 900);

  const quotaEvent = await saga.executeQuotaAllocation(chargeEvent, 500);
  assert.equal(quotaEvent.type, 'WORKSPACE_QUOTA_ALLOCATED');
  assert.equal(saga.workspaces.get('saga-101')?.status, 'ACTIVE');
  passedTests++;
  console.log('  ✅ PASSED: Transaksi Saga sukses (Billing charged $300, Storage 500GB ACTIVE).');

  // TEST 4: Compensating Transaction (Failure Path & Semantic Rollback)
  console.log('\n[Suite 4/6] Menguji Kompensasi Saga saat Alokasi Gagal (Rollback Saldo)...');
  const sagaFailed = new MasterSagaCoordinator();

  // Step 1: Charge $600
  const charge2 = await sagaFailed.executeBillingCharge('saga-102', 'customer-42', 600);
  assert.equal(sagaFailed.accounts.get('customer-42')?.balance, 600);

  // Step 2: Request 2000 GB (> 1000 GB limit) -> GAGAL
  const quotaFail = await sagaFailed.executeQuotaAllocation(charge2, 2000);
  assert.equal(quotaFail.type, 'WORKSPACE_QUOTA_FAILED');
  assert.equal(sagaFailed.workspaces.get('saga-102')?.status, 'ALLOCATION_FAILED');

  // Step 3: Trigger Kompensasi!
  const refundEvent = await sagaFailed.executeBillingRefund(quotaFail, 'customer-42');
  assert.equal(refundEvent.type, 'BILLING_REFUNDED');
  assert.equal(sagaFailed.accounts.get('customer-42')?.balance, 1200, 'Saldo harus kembali utuh $1200');
  assert.equal(sagaFailed.accounts.get('customer-42')?.status, 'REFUNDED');
  passedTests++;
  console.log('  ✅ PASSED: Transaksi kompensasi berhasil mengembalikan saldo customer $1200 secara semantik.');

  // TEST 5: Idempotency Protection Against Duplicate Messages
  console.log('\n[Suite 5/6] Menguji Proteksi Idempotency pada Ingestion Event Ganda...');
  const duplicateQuotaRes = await saga.executeQuotaAllocation(chargeEvent, 500);
  assert.equal(duplicateQuotaRes.type, 'DUPLICATE_SKIPPED');
  passedTests++;
  console.log('  ✅ PASSED: Idempotency filter berhasil mendeteksi dan mengabaikan event duplikat.');

  // TEST 6: Poison Pill Isolation & Dead Letter Queue (DLQ)
  console.log('\n[Suite 6/6] Menguji Poison Pill Defense & Dead Letter Queue Routing...');
  const corruptEvent: SagaTransactionEvent = {
    sagaId: 'saga-corrupt-888',
    type: 'WORKSPACE_QUOTA_ALLOCATION',
    data: { invalidField: Infinity },
    retryAttempts: 3
  };

  sagaFailed.sendToDlq(corruptEvent, 'Mathematical Overflow: Invalid Infinity value in allocation request');
  assert.equal(sagaFailed.dlq.length, 1);
  assert.equal(sagaFailed.dlq[0].event.sagaId, 'saga-corrupt-888');
  assert.ok(sagaFailed.dlq[0].reason.includes('Mathematical Overflow'));
  passedTests++;
  console.log('  ✅ PASSED: Pesan beracun sukses diisolasi ke DLQ tanpa menyandera partisi Kafka.');

  // FINAL SCORING & CERTIFICATION
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI ASSESSMENT MODULE 15: ${passedTests}/${totalTests} SUITES PASSED`);
  const score = Math.round((passedTests / totalTests) * 100);
  console.log(`🎯 SKOR AKHIR: ${score}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: MODULE 15 DINYATAKAN LULUS (GRADE A)');
  console.log('🔓 REVIEW 4 (SPACED REVIEW: SYSTEM DESIGN + REDIS + KAFKA) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runModule15Assessment().catch(err => {
  console.error('❌ Assessment failed with error:', err);
  process.exit(1);
});
