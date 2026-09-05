/**
 * src/gateway/edge-gateway.ts
 *
 * Edge API Gateway:
 * - Token Bucket Rate Limiting (Burst & Refill)
 * - Circuit Breaker State Machine (CLOSED, OPEN, HALF_OPEN)
 * - W3C Trace Context Generator (traceparent)
 */

import { randomBytes } from 'node:crypto';

export class EdgeRateLimiter {
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

  public allowRequest(cost = 1): boolean {
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

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class EdgeCircuitBreaker {
  public readonly name: string;
  private failureThreshold: number;
  private cooldownMs: number;
  private successThreshold: number;

  private state: BreakerState;
  private failures: number;
  private successes: number;
  private nextAttempt: number;

  constructor(name: string, failureThreshold = 3, cooldownMs = 200, successThreshold = 2) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.successThreshold = successThreshold;

    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
  }

  public getState(): BreakerState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
    const curState = this.getState();
    if (curState === 'OPEN') {
      if (fallback) return fallback();
      throw new Error(`CircuitBreaker [${this.name}] is OPEN (Fail-Fast: Downstream Offline)`);
    }

    try {
      const res = await action();
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
        this.nextAttempt = Date.now() + this.cooldownMs;
      }
      if (fallback) return fallback();
      throw err;
    }
  }
}

export class EdgeW3CTracer {
  public static generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  public static generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  public static createTraceparent(traceId?: string, spanId?: string): string {
    const tId = traceId || this.generateTraceId();
    const sId = spanId || this.generateSpanId();
    return `00-${tId}-${sId}-01`;
  }

  public static parseTraceparent(header: string): { traceId: string; spanId: string; sampled: boolean } | null {
    const parts = header.trim().split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;
    return {
      traceId: parts[1],
      spanId: parts[2],
      sampled: parts[3] === '01'
    };
  }
}
