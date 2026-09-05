/**
 * lesson-16.1-practice.ts
 *
 * Cloud Infrastructure & AWS Architecture Practice:
 * 1. AWS IAM Policy Evaluation Engine (Explicit Deny Precedence, Wildcard Matching)
 * 2. Enterprise 3-Tier VPC Subnet Isolation (Public, Private App, Isolated DB)
 * 3. Stateful Security Group Chaining (ALB -> ECS -> RDS)
 *
 * Execution: node --experimental-strip-types lesson-16.1-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. AWS IAM POLICY EVALUATION ENGINE
// ============================================================================

export interface IAMStatement {
  sid?: string;
  effect: 'Allow' | 'Deny';
  action: string[];
  resource: string[];
}

export interface IAMPolicy {
  version: string;
  statements: IAMStatement[];
}

export interface AccessRequest {
  action: string;
  resourceArn: string;
}

export class IAMPolicyEvaluator {
  private static matchWildcard(pattern: string, input: string): boolean {
    const escaped = pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexStr).test(input);
  }

  public static evaluate(policy: IAMPolicy, request: AccessRequest): { allowed: boolean; reason: string } {
    let hasAllow = false;

    for (const stmt of policy.statements) {
      const actionMatches = stmt.action.some(a => this.matchWildcard(a, request.action));
      const resourceMatches = stmt.resource.some(r => this.matchWildcard(r, request.resourceArn));

      if (actionMatches && resourceMatches) {
        // ATURAN 1: Explicit Deny menang mutlak
        if (stmt.effect === 'Deny') {
          return {
            allowed: false,
            reason: `Explicit Deny by Statement [${stmt.sid || 'Anonymous'}] overrides all allows.`
          };
        }
        if (stmt.effect === 'Allow') {
          hasAllow = true;
        }
      }
    }

    if (hasAllow) {
      return { allowed: true, reason: 'Explicit Allow matched.' };
    }

    // Default: Implicit Deny
    return { allowed: false, reason: 'Implicit Deny: No statement explicitly granted access.' };
  }
}

// ============================================================================
// 2. ENTERPRISE 3-TIER VPC & SECURITY GROUP CHAINING SIMULATOR
// ============================================================================

export type SubnetTier = 'PUBLIC' | 'PRIVATE_APP' | 'ISOLATED_DB';

export interface SubnetConfig {
  id: string;
  cidr: string;
  tier: SubnetTier;
  hasInternetGateway: boolean;
  hasNatGatewayRoute: boolean;
}

export interface SecurityGroupRule {
  port: number;
  allowedSourceSgId?: string;
  allowedCidr?: string;
}

export class SecurityGroup {
  public readonly id: string;
  public readonly name: string;
  private inboundRules: SecurityGroupRule[];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.inboundRules = [];
  }

  public addInboundRule(port: number, source: { sgId?: string; cidr?: string }): void {
    this.inboundRules.push({
      port,
      allowedSourceSgId: source.sgId,
      allowedCidr: source.cidr
    });
  }

  public isTrafficAllowed(port: number, incomingSource: { sgId?: string; cidr?: string }): boolean {
    return this.inboundRules.some(rule => {
      if (rule.port !== port) return false;

      // Cek berdasarkan Security Group Chaining
      if (rule.allowedSourceSgId && rule.allowedSourceSgId === incomingSource.sgId) {
        return true;
      }

      // Cek berdasarkan CIDR
      if (rule.allowedCidr && rule.allowedCidr === incomingSource.cidr) {
        return true;
      }

      return false;
    });
  }
}

// ============================================================================
// 3. AUTOMATED VERIFICATION & PRACTICE RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI CLOUD INFRASTRUCTURE & AWS ARCHITECTURE]');

  // Test 1: IAM Policy Evaluation Engine
  console.log('\n--- 1. Verifikasi Aturan Evaluasi AWS IAM (Deny Precedence) ---');
  const taskFlowS3Policy: IAMPolicy = {
    version: '2012-10-17',
    statements: [
      {
        sid: 'AllowAllS3OnTaskFlowBucket',
        effect: 'Allow',
        action: ['s3:*'],
        resource: ['arn:aws:s3:::taskflow-production-assets/*']
      },
      {
        sid: 'PreventObjectDeletion',
        effect: 'Deny',
        action: ['s3:DeleteObject', 's3:DeleteObjectVersion'],
        resource: ['arn:aws:s3:::taskflow-production-assets/*']
      }
    ]
  };

  // Case A: Read Object -> Harusnya ALLOW
  const readReq = IAMPolicyEvaluator.evaluate(taskFlowS3Policy, {
    action: 's3:GetObject',
    resourceArn: 'arn:aws:s3:::taskflow-production-assets/reports/q3.pdf'
  });
  assert.equal(readReq.allowed, true);
  console.log(`✅ GetObject diizinkan: ${readReq.reason}`);

  // Case B: Delete Object -> Harusnya DENY (Explicit Deny menang dari Allow All)
  const deleteReq = IAMPolicyEvaluator.evaluate(taskFlowS3Policy, {
    action: 's3:DeleteObject',
    resourceArn: 'arn:aws:s3:::taskflow-production-assets/reports/q3.pdf'
  });
  assert.equal(deleteReq.allowed, false);
  assert.ok(deleteReq.reason.includes('Explicit Deny'));
  console.log(`🛡️ DeleteObject ditolak: ${deleteReq.reason}`);

  // Case C: Akses Bucket Lain -> Harusnya Implicit Deny
  const otherBucketReq = IAMPolicyEvaluator.evaluate(taskFlowS3Policy, {
    action: 's3:GetObject',
    resourceArn: 'arn:aws:s3:::unauthorized-finance-bucket/secret.csv'
  });
  assert.equal(otherBucketReq.allowed, false);
  assert.ok(otherBucketReq.reason.includes('Implicit Deny'));
  console.log(`🛡️ Akses bucket fiktif ditolak: ${otherBucketReq.reason}`);

  // Test 2: Security Group Chaining (ALB -> ECS -> RDS)
  console.log('\n--- 2. Verifikasi Security Group Chaining (Defense in Depth) ---');
  const sgAlb = new SecurityGroup('sg-alb-100', 'ALB Public Security Group');
  const sgEcs = new SecurityGroup('sg-ecs-200', 'ECS Backend Security Group');
  const sgRds = new SecurityGroup('sg-rds-300', 'Aurora PostgreSQL Security Group');

  // Aturan ALB: Terima HTTPS (443) dari seluruh internet
  sgAlb.addInboundRule(443, { cidr: '0.0.0.0/0' });

  // Aturan ECS: HANYA terima port 3000 jika source berasal dari sgAlb!
  sgEcs.addInboundRule(3000, { sgId: sgAlb.id });

  // Aturan RDS: HANYA terima port 5432 jika source berasal dari sgEcs!
  sgRds.addInboundRule(5432, { sgId: sgEcs.id });

  // Skenario 1: User dari internet (0.0.0.0/0) mengakses ALB port 443 -> DISETUJUI
  assert.equal(sgAlb.isTrafficAllowed(443, { cidr: '0.0.0.0/0' }), true);
  console.log('✅ Traffic internet lolos ke ALB di port 443.');

  // Skenario 2: ALB me-reverse proxy ke ECS port 3000 -> DISETUJUI
  assert.equal(sgEcs.isTrafficAllowed(3000, { sgId: sgAlb.id }), true);
  console.log('✅ Traffic dari ALB lolos ke kontainer ECS di port 3000.');

  // Skenario 3: Hacker internet (0.0.0.0/0) mencoba langsung hit ECS port 3000 -> DITOLAK
  assert.equal(sgEcs.isTrafficAllowed(3000, { cidr: '0.0.0.0/0' }), false);
  console.log('🛡️ Hacker internet yang menembak langsung ke port 3000 ECS DIBLOKIR!');

  // Skenario 4: ECS query ke database RDS port 5432 -> DISETUJUI
  assert.equal(sgRds.isTrafficAllowed(5432, { sgId: sgEcs.id }), true);
  console.log('✅ Query database dari kontainer ECS lolos ke RDS PostgreSQL di port 5432.');

  // Skenario 5: Hacker atau ALB mencoba langsung menembak database RDS port 5432 -> DITOLAK
  assert.equal(sgRds.isTrafficAllowed(5432, { cidr: '0.0.0.0/0' }), false);
  assert.equal(sgRds.isTrafficAllowed(5432, { sgId: sgAlb.id }), false);
  console.log('🛡️ Akses langsung dari internet atau ALB ke database PostgreSQL DIBLOKIR TOTAL!');

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES CLOUD INFRASTRUCTURE & AWS IAM 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in AWS practice:', err);
  process.exit(1);
});
