/**
 * lesson-17.1-practice.ts
 *
 * Observability & Distributed Tracing Practice:
 * 1. OpenTelemetry Distributed Tracer Engine
 * 2. W3C Trace Context Header (traceparent) Serialization & Deserialization
 * 3. Hierarchical Trace Tree & Cross-Service Propagation
 * 4. Prometheus Percentile Latency Calculator (p50, p90, p99)
 *
 * Execution: node --experimental-strip-types lesson-17.1-practice.ts
 */

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// ============================================================================
// 1. OPENTELEMETRY TRACER & W3C PROPAGATION ENGINE
// ============================================================================

export interface TraceContext {
  traceId: string;
  spanId: string;
  isSampled: boolean;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'OK' | 'ERROR';
  attributes: Record<string, string | number | boolean>;
}

export class DistributedTracer {
  public recordedSpans: TraceSpan[];

  constructor() {
    this.recordedSpans = [];
  }

  public static generateTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  public static generateSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * Format: 00-{traceId}-{spanId}-{flags}
   */
  public static injectW3C(ctx: TraceContext): string {
    const flags = ctx.isSampled ? '01' : '00';
    return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
  }

  public static extractW3C(header: string): TraceContext | null {
    const parts = header.trim().split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;
    return {
      traceId: parts[1],
      spanId: parts[2],
      isSampled: parts[3] === '01'
    };
  }

  public startSpan(
    name: string,
    parentCtx?: TraceContext | null,
    attributes: Record<string, any> = {}
  ): { context: TraceContext; end: (status?: 'OK' | 'ERROR') => TraceSpan } {
    const traceId = parentCtx ? parentCtx.traceId : DistributedTracer.generateTraceId();
    const spanId = DistributedTracer.generateSpanId();
    const parentSpanId = parentCtx ? parentCtx.spanId : null;
    const startTime = Date.now();

    const context: TraceContext = { traceId, spanId, isSampled: true };

    return {
      context,
      end: (status = 'OK') => {
        const endTime = Date.now();
        const span: TraceSpan = {
          traceId,
          spanId,
          parentSpanId,
          name,
          startTime,
          endTime,
          durationMs: endTime - startTime,
          status,
          attributes
        };
        this.recordedSpans.push(span);
        return span;
      }
    };
  }
}

// ============================================================================
// 2. PROMETHEUS METRICS COLLECTOR
// ============================================================================

export class PrometheusCollector {
  private counters: Map<string, number>;
  private latencies: number[];

  constructor() {
    this.counters = new Map();
    this.latencies = [];
  }

  public inc(name: string, val = 1): void {
    const cur = this.counters.get(name) || 0;
    this.counters.set(name, cur + val);
  }

  public getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  public observe(durationMs: number): void {
    this.latencies.push(durationMs);
  }

  public getPercentiles(): { p50: number; p90: number; p99: number; count: number } {
    if (this.latencies.length === 0) {
      return { p50: 0, p90: 0, p99: 0, count: 0 };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const getP = (p: number) => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return sorted[idx];
    };

    return {
      p50: getP(50),
      p90: getP(90),
      p99: getP(99),
      count: sorted.length
    };
  }
}

// ============================================================================
// 3. AUTOMATED VERIFICATION & PRACTICE RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI OBSERVABILITY & DISTRIBUTED TRACING]');

  const tracer = new DistributedTracer();
  const metrics = new PrometheusCollector();

  // Test 1: W3C Trace Context Header Serialization / Deserialization
  console.log('\n--- 1. Verifikasi Format W3C traceparent ---');
  const mockContext: TraceContext = {
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    isSampled: true
  };

  const headerStr = DistributedTracer.injectW3C(mockContext);
  assert.equal(headerStr, '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  console.log(`✅ Serialized W3C Header: "${headerStr}"`);

  const parsedContext = DistributedTracer.extractW3C(headerStr);
  assert.equal(parsedContext?.traceId, mockContext.traceId);
  assert.equal(parsedContext?.spanId, mockContext.spanId);
  assert.equal(parsedContext?.isSampled, true);
  console.log('✅ Deserialisasi W3C sukses mengekstrak Trace ID dan Span ID.');

  // Test 2: Multi-Service Hierarchical Trace Propagation
  console.log('\n--- 2. Simulasi Propagasi Trace Melintasi 3 Service (Gateway -> Task -> DB) ---');
  // Service A: API Gateway
  const gatewaySpan = tracer.startSpan('Gateway:RouteRequest', null, { 'http.method': 'POST' });
  await new Promise(r => setTimeout(r, 20)); // gateway processing

  // Forward request ke Task Service dengan membawa header W3C
  const outgoingTraceparent = DistributedTracer.injectW3C(gatewaySpan.context);
  const taskServiceContext = DistributedTracer.extractW3C(outgoingTraceparent);

  // Service B: Task Service (Child Span)
  const taskSpan = tracer.startSpan('TaskService:CreateTask', taskServiceContext, { 'task.id': 't-99' });
  await new Promise(r => setTimeout(r, 30)); // task business logic

  // Task Service query ke Database (Child of Task Service)
  const dbSpan = tracer.startSpan('PostgreSQL:INSERT_tasks', taskSpan.context, { 'db.statement': 'INSERT' });
  await new Promise(r => setTimeout(r, 15)); // db query
  dbSpan.end('OK');

  taskSpan.end('OK');
  gatewaySpan.end('OK');

  // Validasi Trace Tree
  assert.equal(tracer.recordedSpans.length, 3);
  const rootSpan = tracer.recordedSpans.find(s => s.name === 'Gateway:RouteRequest')!;
  const middleSpan = tracer.recordedSpans.find(s => s.name === 'TaskService:CreateTask')!;
  const leafSpan = tracer.recordedSpans.find(s => s.name === 'PostgreSQL:INSERT_tasks')!;

  // Semua span harus memiliki TRACE ID YANG SAMA!
  assert.equal(rootSpan.traceId, middleSpan.traceId);
  assert.equal(rootSpan.traceId, leafSpan.traceId);

  // Relasi Parent-Child
  assert.equal(rootSpan.parentSpanId, null);
  assert.equal(middleSpan.parentSpanId, rootSpan.spanId);
  assert.equal(leafSpan.parentSpanId, middleSpan.spanId);
  console.log(`✅ Trace Tree terverifikasi! Trace ID [${rootSpan.traceId}] konsisten di ketiga span.`);
  console.log(`   [${rootSpan.name}] -> [${middleSpan.name}] -> [${leafSpan.name}]`);

  // Test 3: Prometheus Percentile Latency Calculator
  console.log('\n--- 3. Verifikasi Metrik Persentil Prometheus (P50, P90, P99) ---');
  // Rekam 100 sampel latensi
  // 90 request cepat (~20-40ms)
  for (let i = 0; i < 90; i++) {
    metrics.observe(20 + (i % 20));
  }
  // 9 request sedang (~150-200ms)
  for (let i = 0; i < 9; i++) {
    metrics.observe(150 + i * 5);
  }
  // 1 request lambat outlier (2500ms)
  metrics.observe(2500);

  const stats = metrics.getPercentiles();
  console.log(`Statistik Latensi: p50 = ${stats.p50}ms, p90 = ${stats.p90}ms, p99 = ${stats.p99}ms (Total: ${stats.count} reqs)`);

  assert.ok(stats.p50 <= 40, 'p50 harus mencerminkan mayoritas traffic cepat');
  assert.ok(stats.p90 >= 150, 'p90 harus mendeteksi degradasi traffic sedang');
  assert.ok(stats.p99 >= 2000, 'p99 harus mendeteksi outlier ekstrim 2500ms!');
  console.log('✅ Metrik persentil sukses membedakan median vs outlier ekor!');

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES OPENTELEMETRY & PROMETHEUS METRICS 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in Observability practice:', err);
  process.exit(1);
});
