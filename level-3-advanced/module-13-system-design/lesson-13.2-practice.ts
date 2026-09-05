/**
 * lesson-13.2-practice.ts
 *
 * Microservices Edge Architecture Practice:
 * 1. Token Bucket Rate Limiter (Burst & Constant Refill)
 * 2. Circuit Breaker Finite State Machine (CLOSED -> OPEN -> HALF-OPEN -> CLOSED)
 * 3. Round-Robin Load Balancer with Service Instance Health Checking
 * 4. Resilient API Gateway Orchestration
 *
 * Execution: node --experimental-strip-types lesson-13.2-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. TOKEN BUCKET RATE LIMITER
// ============================================================================

export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRatePerSecond: number;
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  public allowRequest(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  public forceSetTokens(count: number): void {
    this.tokens = count;
    this.lastRefillTimestamp = Date.now();
  }
}

// ============================================================================
// 2. CIRCUIT BREAKER FINITE STATE MACHINE
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  successThreshold: number;
}

export class CircuitBreaker {
  public readonly name: string;
  private options: CircuitBreakerOptions;
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private nextAttempt: number;

  constructor(name: string, options: CircuitBreakerOptions) {
    this.name = name;
    this.options = options;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, fallback?: () => T): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallback) {
        return fallback();
      }
      throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN (Fail-Fast: Downstream Unavailable)`);
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.recoveryTimeoutMs;
    }
  }

  public getMetrics(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.getState(),
      failures: this.failureCount,
      successes: this.successCount
    };
  }
}

// ============================================================================
// 3. LOAD BALANCER & SERVICE DISCOVERY
// ============================================================================

export interface ServiceInstance {
  id: string;
  url: string;
  isHealthy: boolean;
}

export class RoundRobinLoadBalancer {
  private instances: ServiceInstance[];
  private currentIndex: number;

  constructor(instances: ServiceInstance[]) {
    this.instances = instances;
    this.currentIndex = 0;
  }

  public getHealthyInstances(): ServiceInstance[] {
    return this.instances.filter(i => i.isHealthy);
  }

  public nextInstance(): ServiceInstance | null {
    const healthy = this.getHealthyInstances();
    if (healthy.length === 0) return null;

    const selected = healthy[this.currentIndex % healthy.length];
    this.currentIndex = (this.currentIndex + 1) % healthy.length;
    return selected;
  }

  public setInstanceHealth(id: string, isHealthy: boolean): void {
    const inst = this.instances.find(i => i.id === id);
    if (inst) {
      inst.isHealthy = isHealthy;
    }
  }
}

// ============================================================================
// 4. RESILIENT API GATEWAY
// ============================================================================

export interface GatewayRequest {
  path: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface GatewayResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

export class ResilientApiGateway {
  private rateLimiter: TokenBucketRateLimiter;
  private taskCircuitBreaker: CircuitBreaker;
  private taskLoadBalancer: RoundRobinLoadBalancer;

  constructor() {
    // 5 tokens capacity, 2 tokens/sec refill
    this.rateLimiter = new TokenBucketRateLimiter(5, 2);

    // Trip to OPEN after 3 failures, cooldown 300ms, recover after 2 successes in HALF-OPEN
    this.taskCircuitBreaker = new CircuitBreaker('TaskService', {
      failureThreshold: 3,
      recoveryTimeoutMs: 300,
      successThreshold: 2
    });

    this.taskLoadBalancer = new RoundRobinLoadBalancer([
      { id: 'task-node-1', url: 'http://internal-task-1:3000', isHealthy: true },
      { id: 'task-node-2', url: 'http://internal-task-2:3000', isHealthy: true }
    ]);
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.taskCircuitBreaker;
  }

  public getRateLimiter(): TokenBucketRateLimiter {
    return this.rateLimiter;
  }

  public getLoadBalancer(): RoundRobinLoadBalancer {
    return this.taskLoadBalancer;
  }

  public async handleRequest(
    req: GatewayRequest,
    mockDownstreamHandler: (instance: ServiceInstance) => Promise<unknown>
  ): Promise<GatewayResponse> {
    // 1. Rate Limiting Check
    if (!this.rateLimiter.allowRequest()) {
      return {
        statusCode: 429,
        body: { error: 'Too Many Requests (Rate limit exceeded)' },
        headers: { 'Retry-After': '1' }
      };
    }

    // 2. Authentication Offloading / Verification
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer valid-token')) {
      return {
        statusCode: 401,
        body: { error: 'Unauthorized: Invalid or missing token' },
        headers: {}
      };
    }

    // 3. Routing & Load Balancing
    if (req.path.startsWith('/api/v1/tasks')) {
      const instance = this.taskLoadBalancer.nextInstance();
      if (!instance) {
        return {
          statusCode: 503,
          body: { error: 'Service Unavailable: No healthy instances available' },
          headers: {}
        };
      }

      // 4. Circuit Breaker Guard
      try {
        const responseData = await this.taskCircuitBreaker.execute(
          async () => {
            return await mockDownstreamHandler(instance);
          },
          // Fallback data jika circuit OPEN
          () => ({
            source: 'FALLBACK_CACHE',
            tasks: [{ id: 'cached-1', title: 'Offline Task Cache' }]
          })
        );

        return {
          statusCode: 200,
          body: responseData,
          headers: {
            'X-Routed-Instance': instance.id,
            'X-Circuit-State': this.taskCircuitBreaker.getState()
          }
        };
      } catch (err: any) {
        return {
          statusCode: 500,
          body: { error: err.message },
          headers: { 'X-Circuit-State': this.taskCircuitBreaker.getState() }
        };
      }
    }

    return {
      statusCode: 404,
      body: { error: 'Route not found' },
      headers: {}
    };
  }
}

// ============================================================================
// 5. TEST SUITE & DEMO RUNNER
// ============================================================================

export async function runPracticeDemo(): Promise<void> {
  console.log('🚀 [SIMULASI API GATEWAY, LOAD BALANCING & RESILIENCE]');

  const gateway = new ResilientApiGateway();

  // Test 1: Rate Limiter Burst & Exhaustion
  console.log('\n--- 1. Verifikasi Token Bucket Rate Limiter ---');
  gateway.getRateLimiter().forceSetTokens(2); // Set 2 tokens

  const req1 = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async () => ({ success: true })
  );
  assert.equal(req1.statusCode, 200, 'Request 1 harus lolos rate limiter');

  const req2 = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async () => ({ success: true })
  );
  assert.equal(req2.statusCode, 200, 'Request 2 harus lolos rate limiter');

  const req3 = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async () => ({ success: true })
  );
  assert.equal(req3.statusCode, 429, 'Request 3 harus ditolak dengan HTTP 429');
  console.log('✅ Token Bucket sukses memblokir burst yang melebihi kuota (HTTP 429).');

  // Isi ulang token untuk test berikutnya
  gateway.getRateLimiter().forceSetTokens(10);

  // Test 2: Authentication Offloader
  console.log('\n--- 2. Verifikasi Autentikasi di Edge (Gateway) ---');
  const unauthReq = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer invalid' } },
    async () => ({ success: true })
  );
  assert.equal(unauthReq.statusCode, 401, 'Gateway harus menolak request ber-token salah');
  console.log('✅ Gateway menolak request tanpa token valid dengan HTTP 401.');

  // Test 3: Round Robin Load Balancer
  console.log('\n--- 3. Verifikasi Round-Robin Load Balancing ---');
  const lbReq1 = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async (inst) => ({ server: inst.id })
  );
  assert.equal(lbReq1.headers['X-Routed-Instance'], 'task-node-1');

  const lbReq2 = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async (inst) => ({ server: inst.id })
  );
  assert.equal(lbReq2.headers['X-Routed-Instance'], 'task-node-2');

  const lbReq3 = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async (inst) => ({ server: inst.id })
  );
  assert.equal(lbReq3.headers['X-Routed-Instance'], 'task-node-1');
  console.log('✅ Request terdistribusi merata bergantian: node-1 -> node-2 -> node-1.');

  // Test 4: Circuit Breaker Transition (CLOSED -> OPEN -> Fallback)
  console.log('\n--- 4. Verifikasi Circuit Breaker Trip (CLOSED -> OPEN) ---');
  assert.equal(gateway.getCircuitBreaker().getState(), 'CLOSED');

  // Simulasikan 3 kegagalan berturut-turut pada downstream
  for (let i = 1; i <= 3; i++) {
    try {
      await gateway.getCircuitBreaker().execute(async () => {
        throw new Error('Database Connection Pool Timeout');
      });
    } catch {
      // expected failure
    }
  }

  // Sirkuit harus trip menjadi OPEN
  assert.equal(gateway.getCircuitBreaker().getState(), 'OPEN');
  console.log('🛡️ Sirkuit berhasil TRIP menjadi OPEN setelah 3 kegagalan downstream!');

  // Request berikutnya harus langsung dilayani oleh Fallback Cache (Fail-Fast tanpa memanggil downstream)
  let downstreamCalled = false;
  const fallbackRes = await gateway.handleRequest(
    { path: '/api/v1/tasks', method: 'GET', headers: { authorization: 'Bearer valid-token' } },
    async () => {
      downstreamCalled = true;
      return { success: true };
    }
  );
  assert.equal(downstreamCalled, false, 'Downstream tidak boleh dipanggil saat sirkuit OPEN');
  assert.equal((fallbackRes.body as any).source, 'FALLBACK_CACHE');
  console.log('✅ Graceful Fallback disajikan seketika tanpa menyentuh downstream yang sedang mati.');

  // Test 5: Circuit Breaker Recovery (OPEN -> HALF-OPEN -> CLOSED)
  console.log('\n--- 5. Verifikasi Pemulihan Sirkuit (HALF-OPEN -> CLOSED) ---');
  // Tunggu 320ms untuk melewati recoveryTimeoutMs (300ms)
  await new Promise(resolve => setTimeout(resolve, 320));
  assert.equal(gateway.getCircuitBreaker().getState(), 'HALF_OPEN');
  console.log('🔄 Masa cooldown berakhir: Status beralih menjadi HALF-OPEN (Trial Probe).');

  // Kirim 2 request probe sukses (successThreshold = 2)
  await gateway.getCircuitBreaker().execute(async () => 'probe-1-ok');
  assert.equal(gateway.getCircuitBreaker().getState(), 'HALF_OPEN');

  await gateway.getCircuitBreaker().execute(async () => 'probe-2-ok');
  assert.equal(gateway.getCircuitBreaker().getState(), 'CLOSED');
  console.log('🎉 Status sirkuit resmi pulih kembali ke CLOSED!');

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES API GATEWAY & RESILIENCE 100% SUKSES!');
  console.log('======================================================');
}

// Jalankan demo jika dieksekusi langsung
runPracticeDemo().catch(err => {
  console.error('Fatal error in practice demo:', err);
  process.exit(1);
});
