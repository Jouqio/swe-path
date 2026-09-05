/**
 * src/sre/observability-engine.ts
 *
 * SRE Observability & Reliability Governance:
 * - Prometheus Percentile Latency Calculator (p50, p90, p99)
 * - SLI (Service Level Indicator) Calculator
 * - Error Budget Tracker & Deployment Freeze Trigger
 * - Google SRE Multi-Window Multi-Burn-Rate Alert Evaluator
 */

export class SREObservabilityCollector {
  private recordedLatencies: number[];
  public readonly targetSLO: number;
  public readonly errorQuota: number;

  constructor(targetSLO = 0.999) {
    this.recordedLatencies = [];
    this.targetSLO = targetSLO;
    this.errorQuota = 1 - targetSLO;
  }

  public recordLatency(ms: number): void {
    this.recordedLatencies.push(ms);
  }

  public getPercentiles(): { p50: number; p90: number; p99: number } {
    if (this.recordedLatencies.length === 0) return { p50: 0, p90: 0, p99: 0 };
    const sorted = [...this.recordedLatencies].sort((a, b) => a - b);
    const p = (pct: number) => sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];
    return { p50: p(50), p90: p(90), p99: p(99) };
  }

  public computeSLI(goodRequests: number, totalRequests: number): number {
    if (totalRequests === 0) return 1.0;
    return parseFloat((goodRequests / totalRequests).toFixed(4));
  }

  public computeErrorBudget(totalMonthlyRequests: number, failedRequests: number): { remainingPct: number; isFreezeActive: boolean } {
    const allowedFails = totalMonthlyRequests * this.errorQuota;
    const consumed = failedRequests / allowedFails;
    const remainingPct = Math.max(0, parseFloat(((1 - consumed) * 100).toFixed(2)));
    return {
      remainingPct,
      isFreezeActive: remainingPct <= 0
    };
  }

  public computeBurnRate(failed: number, total: number): number {
    if (total === 0) return 0;
    const rate = failed / total;
    return parseFloat((rate / this.errorQuota).toFixed(2));
  }

  public checkMultiBurnRateAlert(
    longWindowFailed: number,
    longWindowTotal: number,
    shortWindowFailed: number,
    shortWindowTotal: number
  ): { shouldPage: boolean; severity: 'NONE' | 'TICKET' | 'PAGE'; message: string } {
    const longBurn = this.computeBurnRate(longWindowFailed, longWindowTotal);
    const shortBurn = this.computeBurnRate(shortWindowFailed, shortWindowTotal);

    if (longBurn >= 14.4 && shortBurn >= 14.4) {
      return {
        shouldPage: true,
        severity: 'PAGE',
        message: `P1 CRITICAL: 14.4x burn rate detected (Long: ${longBurn}x, Short: ${shortBurn}x)`
      };
    }
    if (longBurn >= 6.0 && shortBurn >= 6.0) {
      return {
        shouldPage: true,
        severity: 'PAGE',
        message: `P2 HIGH: 6.0x burn rate detected (Long: ${longBurn}x, Short: ${shortBurn}x)`
      };
    }
    if (longBurn >= 3.0) {
      return {
        shouldPage: false,
        severity: 'TICKET',
        message: `P3 ELEVATED: 3.0x burn rate detected`
      };
    }
    return { shouldPage: false, severity: 'NONE', message: 'Healthy' };
  }
}
