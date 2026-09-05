/**
 * assessment-module-17.ts
 *
 * Automated Practical Assessment Suite for Module 17:
 * Observability, Distributed Tracing (OpenTelemetry), Metrics & SRE (SLI/SLO/Alerting)
 *
 * Execution: node --experimental-strip-types assessment-module-17.ts
 */

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

// ============================================================================
// 1. OPENTELEMETRY TRACER IMPLEMENTATION
// ============================================================================

export interface TraceContextDTO {
  traceId: string;
  spanId: string;
  isSampled: boolean;
}

export interface SpanRecordDTO {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: 'OK' | 'ERROR';
}

export class MasterTracer {
  public spans: SpanRecordDTO[];

  constructor() {
    this.spans = [];
  }

  public static makeTraceId(): string {
    return randomBytes(16).toString('hex');
  }

  public static makeSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  public static serializeW3C(ctx: TraceContextDTO): string {
    return `00-${ctx.traceId}-${ctx.spanId}-${ctx.isSampled ? '01' : '00'}`;
  }

  public static parseW3C(header: string): TraceContextDTO | null {
    const parts = header.trim().split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;
    return {
      traceId: parts[1],
      spanId: parts[2],
      isSampled: parts[3] === '01'
    };
  }

  public start(name: string, parent?: TraceContextDTO | null): { ctx: TraceContextDTO; end: (st?: 'OK' | 'ERROR') => SpanRecordDTO } {
    const traceId = parent ? parent.traceId : MasterTracer.makeTraceId();
    const spanId = MasterTracer.makeSpanId();
    const parentSpanId = parent ? parent.spanId : null;
    const start = Date.now();

    const ctx: TraceContextDTO = { traceId, spanId, isSampled: true };

    return {
      ctx,
      end: (status = 'OK') => {
        const end = Date.now();
        const record: SpanRecordDTO = {
          traceId,
          spanId,
          parentSpanId,
          name,
          startTime: start,
          endTime: end,
          durationMs: end - start,
          status
        };
        this.spans.push(record);
        return record;
      }
    };
  }
}

// ============================================================================
// 2. PROMETHEUS METRICS COLLECTOR IMPLEMENTATION
// ============================================================================

export class MasterPrometheusCollector {
  private latencies: number[];

  constructor() {
    this.latencies = [];
  }

  public record(ms: number): void {
    this.latencies.push(ms);
  }

  public getPercentiles(): { p50: number; p90: number; p99: number } {
    if (this.latencies.length === 0) return { p50: 0, p90: 0, p99: 0 };
    const s = [...this.latencies].sort((a, b) => a - b);
    const p = (pct: number) => s[Math.min(s.length - 1, Math.floor((pct / 100) * s.length))];
    return { p50: p(50), p90: p(90), p99: p(99) };
  }
}

// ============================================================================
// 3. SRE ENGINE IMPLEMENTATION
// ============================================================================

export class MasterSREEngine {
  public readonly targetSLO: number; // 0.999
  public readonly errorQuotaRatio: number; // 0.001

  constructor(targetSLO = 0.999) {
    this.targetSLO = targetSLO;
    this.errorQuotaRatio = 1 - targetSLO;
  }

  public getSLI(successCount: number, totalCount: number): number {
    if (totalCount === 0) return 1.0;
    return parseFloat((successCount / totalCount).toFixed(4));
  }

  public getBurnRate(failedCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    const errRate = failedCount / totalCount;
    return parseFloat((errRate / this.errorQuotaRatio).toFixed(2));
  }

  public checkBudget(totalMonthRequests: number, totalFails: number): { remainingPct: number; freeze: boolean } {
    const totalAllowed = totalMonthRequests * this.errorQuotaRatio;
    const consumed = totalFails / totalAllowed;
    const remainingPct = Math.max(0, parseFloat(((1 - consumed) * 100).toFixed(2)));
    return {
      remainingPct,
      freeze: remainingPct <= 0
    };
  }

  public evaluateMultiBurnAlert(
    longFails: number,
    longTotal: number,
    shortFails: number,
    shortTotal: number
  ): { page: boolean; level: 'NONE' | 'TICKET' | 'PAGE'; reason: string } {
    const longBurn = this.getBurnRate(longFails, longTotal);
    const shortBurn = this.getBurnRate(shortFails, shortTotal);

    if (longBurn >= 14.4 && shortBurn >= 14.4) {
      return { page: true, level: 'PAGE', reason: `P1 Critical: 14.4x burn rate detected` };
    }
    if (longBurn >= 6.0 && shortBurn >= 6.0) {
      return { page: true, level: 'PAGE', reason: `P2 High: 6.0x burn rate detected` };
    }
    if (longBurn >= 3.0) {
      return { page: false, level: 'TICKET', reason: `P3 Elevated: 3.0x burn rate detected` };
    }
    return { page: false, level: 'NONE', reason: `Healthy` };
  }
}

// ============================================================================
// 4. MASTER ASSESSMENT EXECUTION
// ============================================================================

async function runModule17Assessment(): Promise<void> {
  console.log('================================================================');
  console.log('🎓 MODULE 17 ASSESSMENT: OBSERVABILITY, TRACING & SRE');
  console.log('================================================================');

  let passedTests = 0;
  const totalTests = 6;

  // TEST 1: W3C Trace Context Serialization & Deserialization
  console.log('\n[Suite 1/6] Menguji Serialisasi & Deserialisasi Header W3C traceparent...');
  const sampleContext: TraceContextDTO = {
    traceId: '1234567890abcdef1234567890abcdef',
    spanId: 'fedcba0987654321',
    isSampled: true
  };
  const header = MasterTracer.serializeW3C(sampleContext);
  assert.equal(header, '00-1234567890abcdef1234567890abcdef-fedcba0987654321-01');

  const parsed = MasterTracer.parseW3C(header);
  assert.equal(parsed?.traceId, sampleContext.traceId);
  assert.equal(parsed?.spanId, sampleContext.spanId);
  assert.equal(parsed?.isSampled, true);
  passedTests++;
  console.log('  ✅ PASSED: W3C traceparent header syntax valid dan ter-parse sempurna.');

  // TEST 2: Multi-Service Distributed Trace Hierarchy
  console.log('\n[Suite 2/6] Menguji Propagasi Trace Melintasi 3 Service...');
  const tracer = new MasterTracer();

  // 1. Gateway Span (Root)
  const s1 = tracer.start('ALB:Routing');
  await new Promise(r => setTimeout(r, 15));

  // 2. TaskService Span (Child of Gateway)
  const s2 = tracer.start('TaskService:Execute', s1.ctx);
  await new Promise(r => setTimeout(r, 25));

  // 3. Database Span (Child of TaskService)
  const s3 = tracer.start('PostgreSQL:Query', s2.ctx);
  await new Promise(r => setTimeout(r, 10));
  s3.end('OK');

  s2.end('OK');
  s1.end('OK');

  assert.equal(tracer.spans.length, 3);
  const alb = tracer.spans.find(s => s.name === 'ALB:Routing')!;
  const task = tracer.spans.find(s => s.name === 'TaskService:Execute')!;
  const db = tracer.spans.find(s => s.name === 'PostgreSQL:Query')!;

  assert.equal(alb.traceId, task.traceId);
  assert.equal(alb.traceId, db.traceId);
  assert.equal(alb.parentSpanId, null);
  assert.equal(task.parentSpanId, alb.spanId);
  assert.equal(db.parentSpanId, task.spanId);
  passedTests++;
  console.log('  ✅ PASSED: Trace ID identik pada seluruh spans dan relasi parent-child terbentuk rapi.');

  // TEST 3: Prometheus Percentile Calculation (p50, p90, p99)
  console.log('\n[Suite 3/6] Menguji Akurasi Perhitungan Persentil Prometheus (P50/P90/P99)...');
  const prom = new MasterPrometheusCollector();
  for (let i = 0; i < 90; i++) prom.record(25); // 90x cepat
  for (let i = 0; i < 9; i++) prom.record(150); // 9x sedang
  prom.record(3000); // 1x outlier parah (3 detik)

  const pStats = prom.getPercentiles();
  assert.equal(pStats.p50, 25);
  assert.equal(pStats.p90, 150);
  assert.equal(pStats.p99, 3000);
  passedTests++;
  console.log(`  ✅ PASSED: Percentile akurat (p50=${pStats.p50}ms, p90=${pStats.p90}ms, p99=${pStats.p99}ms).`);

  // TEST 4: SLI Calculation & Error Budget Tracking
  console.log('\n[Suite 4/6] Menguji Perhitungan SLI & Error Budget...');
  const sre = new MasterSREEngine(0.999); // Target 99.9%
  const sli = sre.getSLI(9995, 10000);
  assert.equal(sli, 0.9995);

  const budgetOk = sre.checkBudget(10_000_000, 4000);
  assert.equal(budgetOk.remainingPct, 60.0);
  assert.equal(budgetOk.freeze, false);
  passedTests++;
  console.log(`  ✅ PASSED: SLI ${(sli * 100).toFixed(2)}% terhitung dan Error Budget tersisa ${budgetOk.remainingPct}%.`);

  // TEST 5: Deployment Freeze Enforcement
  console.log('\n[Suite 5/6] Menguji Kebijakan Deployment Freeze saat Error Budget Habis...');
  const budgetDepleted = sre.checkBudget(10_000_000, 15000);
  assert.equal(budgetDepleted.remainingPct, 0);
  assert.equal(budgetDepleted.freeze, true, 'Deployment Freeze harus otomatis aktif saat budget 0%');
  passedTests++;
  console.log('  ✅ PASSED: Deployment Freeze berhasil diaktifkan saat toleransi kegagalan habis.');

  // TEST 6: Multi-Window Multi-Burn-Rate Alerting
  console.log('\n[Suite 6/6] Menguji Multi-Window Multi-Burn-Rate Alerting (Google SRE)...');
  // 1. False Positive Spike (Short window spike 20x, Long window normal 0.5x)
  const alertSpike = sre.evaluateMultiBurnAlert(50, 100000, 20, 1000);
  assert.equal(alertSpike.page, false, 'Spike sesaat tidak boleh memicu pager darurat');

  // 2. P1 Critical Page (Keduanya >= 14.4x)
  const alertCritical = sre.evaluateMultiBurnAlert(200, 10000, 20, 1000);
  assert.equal(alertCritical.page, true);
  assert.equal(alertCritical.level, 'PAGE');

  // 3. P3 Ticket (Long window >= 3.0x)
  const alertTicket = sre.evaluateMultiBurnAlert(30, 10000, 3, 1000);
  assert.equal(alertTicket.page, false);
  assert.equal(alertTicket.level, 'TICKET');
  passedTests++;
  console.log('  ✅ PASSED: Multi-window alerting membedakan spike palsu vs P1 Page vs P3 Ticket.');

  // FINAL SCORING & CERTIFICATION
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI ASSESSMENT MODULE 17: ${passedTests}/${totalTests} SUITES PASSED`);
  const score = Math.round((passedTests / totalTests) * 100);
  console.log(`🎯 SKOR AKHIR: ${score}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: MODULE 17 DINYATAKAN LULUS (GRADE A)');
  console.log('🔓 CAPSTONE PROJECT 3 (HIGH-THROUGHPUT DISTRIBUTED TASKFLOW PLATFORM) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runModule17Assessment().catch(err => {
  console.error('❌ Assessment failed with error:', err);
  process.exit(1);
});
