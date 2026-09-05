/**
 * lesson-15.2-practice.ts
 *
 * Distributed Transactions & Failure Recovery:
 * 1. Saga Choreography Pattern (Success Path)
 * 2. Compensating Transaction Rollback on Downstream Failure
 * 3. Idempotent Consumer Protection against Duplicate Event Ingestion
 * 4. Poison Pill Handling & Dead Letter Queue (DLQ) Routing
 *
 * Execution: node --experimental-strip-types lesson-15.2-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. SAGA CHOREOGRAPHY & COMPENSATING TRANSACTION ENGINE
// ============================================================================

export interface SagaEvent {
  sagaId: string;
  eventType: string;
  payload: Record<string, unknown>;
  retryCount: number;
}

export interface DLQRecord {
  event: SagaEvent;
  error: string;
  timestamp: number;
}

export class TaskFlowSagaSimulator {
  // Database Billing Service
  public billingAccounts: Map<string, { balance: number; lastCharge: number; status: string }>;
  // Database Workspace Service
  public workspaceAllocations: Map<string, { storageGb: number; status: string }>;
  // Dead Letter Queue
  public dlq: DLQRecord[];
  // Idempotency Store
  public processedEventKeys: Set<string>;

  constructor() {
    this.billingAccounts = new Map([['user-1', { balance: 1000, lastCharge: 0, status: 'ACTIVE' }]]);
    this.workspaceAllocations = new Map();
    this.dlq = [];
    this.processedEventKeys = new Set();
  }

  /**
   * STEP 1: Billing Charge (Compensable Action)
   */
  public async chargeCustomer(sagaId: string, userId: string, amount: number): Promise<SagaEvent> {
    const acc = this.billingAccounts.get(userId);
    if (!acc || acc.balance < amount) {
      throw new Error(`Insufficient funds for user ${userId}`);
    }

    acc.balance -= amount;
    acc.lastCharge = amount;
    acc.status = 'CHARGED';

    return {
      sagaId,
      eventType: 'BILLING_CHARGED',
      payload: { userId, amount },
      retryCount: 0
    };
  }

  /**
   * STEP 2: Workspace Allocation (Forward Action)
   * Gagal jika requestedStorage > 500 GB (Simulasi batas kapasitas server).
   */
  public async allocateWorkspace(event: SagaEvent, requestedStorageGb: number): Promise<SagaEvent> {
    const eventKey = `${event.sagaId}:${event.eventType}`;
    if (this.processedEventKeys.has(eventKey)) {
      // Idempotent: Abaikan duplikasi
      return {
        sagaId: event.sagaId,
        eventType: 'IDEMPOTENT_SKIPPED',
        payload: {},
        retryCount: 0
      };
    }
    this.processedEventKeys.add(eventKey);

    if (requestedStorageGb > 500) {
      // Simulasi Kegagalan Downstream!
      this.workspaceAllocations.set(event.sagaId, { storageGb: requestedStorageGb, status: 'FAILED' });
      return {
        sagaId: event.sagaId,
        eventType: 'WORKSPACE_ALLOCATION_FAILED',
        payload: { error: 'STORAGE_QUOTA_EXCEEDED', maxAllowedGb: 500 },
        retryCount: 0
      };
    }

    this.workspaceAllocations.set(event.sagaId, { storageGb: requestedStorageGb, status: 'ACTIVE' });
    return {
      sagaId: event.sagaId,
      eventType: 'WORKSPACE_ALLOCATED',
      payload: { storageGb: requestedStorageGb },
      retryCount: 0
    };
  }

  /**
   * STEP 3: Compensating Transaction!
   * Billing Service me-refund uang karena alokasi storage gagal.
   */
  public async compensateBilling(event: SagaEvent, userId: string): Promise<SagaEvent> {
    const acc = this.billingAccounts.get(userId);
    if (acc && acc.status === 'CHARGED') {
      acc.balance += acc.lastCharge;
      acc.status = 'REFUNDED';
    }

    return {
      sagaId: event.sagaId,
      eventType: 'BILLING_REFUNDED',
      payload: { userId, refundedAmount: acc?.lastCharge || 0 },
      retryCount: 0
    };
  }

  /**
   * ROUTER KE DEAD LETTER QUEUE (DLQ)
   */
  public routeToDlq(event: SagaEvent, error: string): void {
    this.dlq.push({
      event,
      error,
      timestamp: Date.now()
    });
  }
}

// ============================================================================
// 2. AUTOMATED PRACTICE TEST RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI SAGA DISTRIBUTED TRANSACTIONS & DLQ]');

  // Kasus 1: Happy Path (Semua Langkah Sukses)
  console.log('\n--- 1. Verifikasi Happy Path Saga (Upgrade 200 GB Storage) ---');
  const saga1 = new TaskFlowSagaSimulator();

  const chargeEvent1 = await saga1.chargeCustomer('saga-001', 'user-1', 200);
  assert.equal(chargeEvent1.eventType, 'BILLING_CHARGED');
  assert.equal(saga1.billingAccounts.get('user-1')?.balance, 800);
  console.log(`✅ Step 1: Billing charged $200. Saldo tersisa = $${saga1.billingAccounts.get('user-1')?.balance}.`);

  const allocateEvent1 = await saga1.allocateWorkspace(chargeEvent1, 200);
  assert.equal(allocateEvent1.eventType, 'WORKSPACE_ALLOCATED');
  assert.equal(saga1.workspaceAllocations.get('saga-001')?.status, 'ACTIVE');
  console.log('✅ Step 2: Workspace storage 200 GB sukses dialokasikan. Status = ACTIVE.');
  console.log('🎉 Transaksi Saga-001 sukses mencapai konsistensi penuh!');

  // Kasus 2: Failure Path dengan Compensating Transaction (Rollback Semantik)
  console.log('\n--- 2. Verifikasi Failure Path & Kompensasi (Upgrade 800 GB Melebihi Kuota) ---');
  const saga2 = new TaskFlowSagaSimulator();

  // Step 1: Billing memotong $500
  const chargeEvent2 = await saga2.chargeCustomer('saga-002', 'user-1', 500);
  assert.equal(saga2.billingAccounts.get('user-1')?.balance, 500);
  console.log(`✅ Step 1: Billing charged $500. Saldo sementara = $${saga2.billingAccounts.get('user-1')?.balance}.`);

  // Step 2: Workspace gagal mengalokasikan 800 GB (> 500 GB)
  const allocateEvent2 = await saga2.allocateWorkspace(chargeEvent2, 800);
  assert.equal(allocateEvent2.eventType, 'WORKSPACE_ALLOCATION_FAILED');
  console.log('⚠️ Step 2 GAGAL: Kapasitas storage terlampaui. Menembakkan event kegagalan!');

  // Step 3: Trigger Kompensasi!
  const refundEvent = await saga2.compensateBilling(allocateEvent2, 'user-1');
  assert.equal(refundEvent.eventType, 'BILLING_REFUNDED');
  assert.equal(saga2.billingAccounts.get('user-1')?.balance, 1000, 'Saldo harus kembali utuh $1000 setelah kompensasi');
  assert.equal(saga2.billingAccounts.get('user-1')?.status, 'REFUNDED');
  console.log(`🛡️ Kompensasi Sukses: Saldo customer dikembalikan utuh ke $${saga2.billingAccounts.get('user-1')?.balance}!`);

  // Kasus 3: Idempotent Consumer Handling
  console.log('\n--- 3. Verifikasi Idempotent Consumer (Mencegah Duplikasi Event) ---');
  // Coba kirim event yang sama lagi ke allocateWorkspace
  const duplicateRes = await saga1.allocateWorkspace(chargeEvent1, 200);
  assert.equal(duplicateRes.eventType, 'IDEMPOTENT_SKIPPED');
  console.log('✅ Idempotency terbukti: Event duplikat diabaikan dan tidak memicu alokasi ganda.');

  // Kasus 4: Poison Pill Event & Dead Letter Queue Routing
  console.log('\n--- 4. Verifikasi Poison Pill Handling & Dead Letter Queue (DLQ) ---');
  const poisonEvent: SagaEvent = {
    sagaId: 'saga-corrupt-999',
    eventType: 'WORKSPACE_ALLOCATION',
    payload: { badData: NaN },
    retryCount: 3 // Sudah mencapai batas maksimal retry
  };

  saga2.routeToDlq(poisonEvent, 'Corrupted Payload: NaN value detected in quota calculation');
  assert.equal(saga2.dlq.length, 1);
  assert.equal(saga2.dlq[0].event.sagaId, 'saga-corrupt-999');
  console.log(`🛡️ DLQ Routing Sukses: Pesan beracun diisolasi ke DLQ (Total pesan di DLQ: ${saga2.dlq.length}).`);
  console.log(`   Error Log: "${saga2.dlq[0].error}"`);

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES SAGA TRANSACTION & DLQ 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in Saga practice:', err);
  process.exit(1);
});
