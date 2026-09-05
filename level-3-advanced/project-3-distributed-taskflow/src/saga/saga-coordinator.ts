/**
 * src/saga/saga-coordinator.ts
 *
 * Distributed Saga Transactions & Failure Compensation:
 * - Multi-Service Orchestration (Billing + Workspace Quota)
 * - Semantic Compensating Transaction (Refund)
 * - Dead Letter Queue (DLQ) for Poison Pill Events
 * - Idempotency Deduplication Filter
 */

export interface TransactionStepEvent {
  sagaId: string;
  step: string;
  payload: Record<string, unknown>;
}

export class TaskFlowSagaCoordinator {
  public customerBalances: Map<string, { balance: number; lastDebited: number }>;
  public workspaceQuotas: Map<string, { quotaGb: number; status: 'ACTIVE' | 'FAILED' }>;
  public dlqRecords: Array<{ event: TransactionStepEvent; reason: string; timestamp: number }>;
  public processedSagaSteps: Set<string>;

  constructor() {
    this.customerBalances = new Map([
      ['cust-100', { balance: 2500, lastDebited: 0 }],
      ['cust-200', { balance: 100, lastDebited: 0 }]
    ]);
    this.workspaceQuotas = new Map();
    this.dlqRecords = [];
    this.processedSagaSteps = new Set();
  }

  /**
   * STEP 1: Billing Charge (Compensable Transaction)
   */
  public async debitCustomerAccount(sagaId: string, customerId: string, amount: number): Promise<TransactionStepEvent> {
    const acc = this.customerBalances.get(customerId);
    if (!acc || acc.balance < amount) {
      throw new Error(`Insufficient funds: Required $${amount}, available $${acc?.balance || 0}`);
    }

    acc.balance -= amount;
    acc.lastDebited = amount;

    return {
      sagaId,
      step: 'BILLING_DEBITED',
      payload: { customerId, amount }
    };
  }

  /**
   * STEP 2: Allocate Workspace Quota
   * Gagal jika requestedGb > 1000 GB (Simulasi kapasitas cluster habis)
   */
  public async allocateStorageQuota(event: TransactionStepEvent, requestedGb: number): Promise<TransactionStepEvent> {
    const dedupeKey = `${event.sagaId}:${event.step}`;
    if (this.processedSagaSteps.has(dedupeKey)) {
      return { sagaId: event.sagaId, step: 'SKIPPED_IDEMPOTENT', payload: {} };
    }
    this.processedSagaSteps.add(dedupeKey);

    if (requestedGb > 1000) {
      this.workspaceQuotas.set(event.sagaId, { quotaGb: requestedGb, status: 'FAILED' });
      return {
        sagaId: event.sagaId,
        step: 'QUOTA_ALLOCATION_FAILED',
        payload: { error: 'CAPACITY_EXCEEDED', maxAllowedGb: 1000 }
      };
    }

    this.workspaceQuotas.set(event.sagaId, { quotaGb: requestedGb, status: 'ACTIVE' });
    return {
      sagaId: event.sagaId,
      step: 'QUOTA_ALLOCATED',
      payload: { quotaGb: requestedGb }
    };
  }

  /**
   * STEP 3: Compensating Transaction (Refund)
   */
  public async refundCustomerAccount(event: TransactionStepEvent, customerId: string): Promise<TransactionStepEvent> {
    const acc = this.customerBalances.get(customerId);
    if (acc && acc.lastDebited > 0) {
      acc.balance += acc.lastDebited;
      const refunded = acc.lastDebited;
      acc.lastDebited = 0;
      return {
        sagaId: event.sagaId,
        step: 'BILLING_REFUNDED',
        payload: { customerId, refundedAmount: refunded }
      };
    }

    return {
      sagaId: event.sagaId,
      step: 'REFUND_NOT_NEEDED',
      payload: { customerId }
    };
  }

  public pushToDlq(event: TransactionStepEvent, reason: string): void {
    this.dlqRecords.push({
      event,
      reason,
      timestamp: Date.now()
    });
  }
}
