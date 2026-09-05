/**
 * lesson-17.2-practice.ts
 *
 * Site Reliability Engineering (SRE) Practice:
 * 1. SLI (Service Level Indicator) Calculation
 * 2. Error Budget Tracking & Deployment Freeze Policy
 * 3. Multi-Window Multi-Burn-Rate Alert Evaluation (Google SRE Framework)
 *
 * Execution: node --experimental-strip-types lesson-17.2-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. SRE ENGINE IMPLEMENTATION
// ============================================================================

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
}

export type AlertSeverity = 'NONE' | 'TICKET' | 'PAGE';

export interface AlertResult {
  shouldPage: boolean;
  severity: AlertSeverity;
  reason: string;
}

export class SREEngine {
  public readonly sloTarget: number; // Misal 0.999 (99.9%)
  public readonly allowedErrorRate: number; // 1 - 0.999 = 0.001

  constructor(sloTarget = 0.999) {
    this.sloTarget = sloTarget;
    this.allowedErrorRate = 1 - sloTarget;
  }

  public calculateSLI(metrics: RequestMetrics): number {
    if (metrics.total === 0) return 1.0;
    return metrics.successful / metrics.total;
  }

  public calculateBurnRate(metrics: RequestMetrics): number {
    if (metrics.total === 0) return 0;
    const currentErrorRate = metrics.failed / metrics.total;
    return parseFloat((currentErrorRate / this.allowedErrorRate).toFixed(2));
  }

  public evaluateBudgetStatus(
    totalMonthlyRequests: number,
    failedRequests: number
  ): {
    remainingPercentage: number;
    isDeploymentFreezeActive: boolean;
  } {
    const totalAllowedFailures = totalMonthlyRequests * this.allowedErrorRate;
    const consumedRatio = failedRequests / totalAllowedFailures;
    const remainingPercentage = Math.max(0, parseFloat(((1 - consumedRatio) * 100).toFixed(2)));

    return {
      remainingPercentage,
      isDeploymentFreezeActive: remainingPercentage <= 0
    };
  }

  /**
   * Google SRE Multi-Window Multi-Burn-Rate Alerting:
   * Menilai jendela panjang dan jendela pendek secara bersamaan (AND condition)
   */
  public evaluateMultiWindowAlert(longWindow: RequestMetrics, shortWindow: RequestMetrics): AlertResult {
    const longBurn = this.calculateBurnRate(longWindow);
    const shortBurn = this.calculateBurnRate(shortWindow);

    // 1. P1 Critical Page: 14.4x Burn Rate (2% budget lenyap dalam 1 jam)
    if (longBurn >= 14.4 && shortBurn >= 14.4) {
      return {
        shouldPage: true,
        severity: 'PAGE',
        reason: `P1 CRITICAL: 14.4x burn rate detected (Long: ${longBurn.toFixed(1)}x, Short: ${shortBurn.toFixed(1)}x). PagerDuty alert triggered!`
      };
    }

    // 2. P2 High Page: 6.0x Burn Rate (5% budget lenyap dalam 6 jam)
    if (longBurn >= 6.0 && shortBurn >= 6.0) {
      return {
        shouldPage: true,
        severity: 'PAGE',
        reason: `P2 HIGH: 6.0x burn rate detected (Long: ${longBurn.toFixed(1)}x, Short: ${shortBurn.toFixed(1)}x). PagerDuty alert triggered.`
      };
    }

    // 3. P3 Ticket: 3.0x Burn Rate (Degradasi lambat)
    if (longBurn >= 3.0) {
      return {
        shouldPage: false,
        severity: 'TICKET',
        reason: `P3 ELEVATED: 3.0x burn rate detected. Created investigation Jira ticket.`
      };
    }

    return {
      shouldPage: false,
      severity: 'NONE',
      reason: 'System healthy within SLO limits.'
    };
  }
}

// ============================================================================
// 2. AUTOMATED PRACTICE TEST RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI SRE, SLI/SLO & MULTI-BURN-RATE ALERTING]');

  const sre = new SREEngine(0.999); // Target SLO: 99.9% (Error Budget: 0.1%)

  // Test 1: SLI Calculation
  console.log('\n--- 1. Verifikasi Perhitungan SLI ---');
  const sample1: RequestMetrics = { total: 10000, successful: 9992, failed: 8 };
  const sli1 = sre.calculateSLI(sample1);
  assert.equal(sli1, 0.9992);
  console.log(`✅ SLI Terhitung: ${(sli1 * 100).toFixed(2)}% (Target: 99.90%) -> Target Tercapai.`);

  // Test 2: Error Budget & Deployment Freeze Policy
  console.log('\n--- 2. Verifikasi Error Budget & Deployment Freeze Policy ---');
  const totalMonthlyTraffic = 10_000_000; // 10 juta request per bulan
  // Batas error yang diizinkan = 10.000.000 * 0.001 = 10.000 error

  // Skenario A: 3.000 error terjadi -> Sisa 70% budget
  const budgetA = sre.evaluateBudgetStatus(totalMonthlyTraffic, 3000);
  assert.equal(budgetA.remainingPercentage, 70);
  assert.equal(budgetA.isDeploymentFreezeActive, false);
  console.log(`✅ Sisa Error Budget: ${budgetA.remainingPercentage}%. Deployment Freeze: FALSE (Inovasi fitur berjalan lancar).`);

  // Skenario B: 11.000 error terjadi -> Budget Habis (0%)
  const budgetB = sre.evaluateBudgetStatus(totalMonthlyTraffic, 11000);
  assert.equal(budgetB.remainingPercentage, 0);
  assert.equal(budgetB.isDeploymentFreezeActive, true);
  console.log(`🛡️ Sisa Error Budget: 0%! DEPLOYMENT FREEZE: TRUE (Rilis fitur baru dibekukan demi stabilitas).`);

  // Test 3: Burn Rate Calculation
  console.log('\n--- 3. Verifikasi Kalkulasi Burn Rate ---');
  // Normal: Error rate 0.1% -> Burn rate = 1.0x
  const normalBurn = sre.calculateBurnRate({ total: 1000, successful: 999, failed: 1 });
  assert.equal(normalBurn, 1.0);
  console.log(`✅ Normal Burn Rate: ${normalBurn}x.`);

  // Lonjakan Kritis: Error rate 2.0% -> Burn rate = 0.02 / 0.001 = 20.0x
  const criticalBurn = sre.calculateBurnRate({ total: 1000, successful: 980, failed: 20 });
  assert.equal(criticalBurn, 20.0);
  console.log(`⚠️ Critical Burn Rate: ${criticalBurn}x.`);

  // Test 4: Multi-Window Multi-Burn-Rate Alerting
  console.log('\n--- 4. Verifikasi Multi-Window Alerting (Google SRE Framework) ---');

  // Case A: Spike Error Palsu (Hanya di short window, long window aman)
  const falseSpikeLong: RequestMetrics = { total: 100000, successful: 99950, failed: 50 }; // Burn 0.5x
  const falseSpikeShort: RequestMetrics = { total: 1000, successful: 980, failed: 20 }; // Burn 20x
  const alertA = sre.evaluateMultiWindowAlert(falseSpikeLong, falseSpikeShort);
  assert.equal(alertA.shouldPage, false, 'Tidak boleh membunyikan pager untuk spike sesaat yang tidak mengancam SLO');
  console.log(`🛡️ Alert Palsu Tereliminasi: Status = ${alertA.severity} (${alertA.reason})`);

  // Case B: Bencana Kritis Nyata (Keduanya melebihi 14.4x)
  const trueIncidentLong: RequestMetrics = { total: 10000, successful: 9800, failed: 200 }; // Burn 20x
  const trueIncidentShort: RequestMetrics = { total: 1000, successful: 980, failed: 20 }; // Burn 20x
  const alertB = sre.evaluateMultiWindowAlert(trueIncidentLong, trueIncidentShort);
  assert.equal(alertB.shouldPage, true);
  assert.equal(alertB.severity, 'PAGE');
  console.log(`🚨 PAGER ON-CALL BERBUNYI: ${alertB.reason}`);

  // Case C: Degradasi Lambat (Burn Rate 3.0x -> Tiket Jira)
  const slowBurnLong: RequestMetrics = { total: 10000, successful: 9970, failed: 30 }; // Burn 3x
  const slowBurnShort: RequestMetrics = { total: 1000, successful: 997, failed: 3 }; // Burn 3x
  const alertC = sre.evaluateMultiWindowAlert(slowBurnLong, slowBurnShort);
  assert.equal(alertC.shouldPage, false);
  assert.equal(alertC.severity, 'TICKET');
  console.log(`📋 Tiket Otomatis Dibuat: Status = ${alertC.severity} (${alertC.reason})`);

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES SRE SLI/SLO & ALERTING 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in SRE practice:', err);
  process.exit(1);
});
