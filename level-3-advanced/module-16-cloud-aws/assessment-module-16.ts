/**
 * assessment-module-16.ts
 *
 * Automated Practical Assessment Suite for Module 16:
 * Cloud Infrastructure & DevOps on AWS (IAM, Security Groups, Terraform DAG & State Locking)
 *
 * Execution: node --experimental-strip-types assessment-module-16.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. AWS IAM POLICY ENGINE IMPLEMENTATION
// ============================================================================

export interface IAMStmt {
  sid?: string;
  effect: 'Allow' | 'Deny';
  action: string[];
  resource: string[];
}

export interface IAMDoc {
  statements: IAMStmt[];
}

export class MasterIAMEvaluator {
  private static match(pattern: string, input: string): boolean {
    const esc = pattern.replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&');
    return new RegExp('^' + esc.replace(/\*/g, '.*') + '$').test(input);
  }

  public static checkAccess(doc: IAMDoc, action: string, resourceArn: string): { isAllowed: boolean; reason: string } {
    let hasAllow = false;

    for (const s of doc.statements) {
      const aMatch = s.action.some(a => this.match(a, action));
      const rMatch = s.resource.some(r => this.match(r, resourceArn));

      if (aMatch && rMatch) {
        if (s.effect === 'Deny') {
          return { isAllowed: false, reason: `Explicit Deny by [${s.sid || 'Stmt'}]` };
        }
        if (s.effect === 'Allow') {
          hasAllow = true;
        }
      }
    }

    if (hasAllow) return { isAllowed: true, reason: 'Explicit Allow matched' };
    return { isAllowed: false, reason: 'Implicit Deny: No statement matched' };
  }
}

// ============================================================================
// 2. SECURITY GROUP CHAINING IMPLEMENTATION
// ============================================================================

export interface SGRule {
  port: number;
  sourceSg?: string;
  sourceCidr?: string;
}

export class MasterSecurityGroup {
  public readonly id: string;
  private rules: SGRule[];

  constructor(id: string) {
    this.id = id;
    this.rules = [];
  }

  public addRule(port: number, src: { sgId?: string; cidr?: string }): void {
    this.rules.push({ port, sourceSg: src.sgId, sourceCidr: src.cidr });
  }

  public allows(port: number, incoming: { sgId?: string; cidr?: string }): boolean {
    return this.rules.some(r => {
      if (r.port !== port) return false;
      if (r.sourceSg && r.sourceSg === incoming.sgId) return true;
      if (r.sourceCidr && r.sourceCidr === incoming.cidr) return true;
      return false;
    });
  }
}

// ============================================================================
// 3. TERRAFORM DAG & CYCLE RESOLVER IMPLEMENTATION
// ============================================================================

export interface InfraNode {
  id: string;
  deps: string[];
}

export class MasterTerraformDAG {
  public static resolveOrder(nodes: InfraNode[]): string[] {
    const inDegrees: Map<string, number> = new Map();
    const adj: Map<string, string[]> = new Map();

    for (const n of nodes) {
      inDegrees.set(n.id, 0);
      adj.set(n.id, []);
    }

    for (const n of nodes) {
      for (const d of n.deps) {
        if (!adj.has(d)) throw new Error(`Missing dependency [${d}] for [${n.id}]`);
        adj.get(d)!.push(n.id);
        inDegrees.set(n.id, (inDegrees.get(n.id) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegrees.entries()) {
      if (deg === 0) queue.push(id);
    }

    const res: string[] = [];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      res.push(cur);

      for (const neighbor of adj.get(cur) || []) {
        inDegrees.set(neighbor, inDegrees.get(neighbor)! - 1);
        if (inDegrees.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (res.length !== nodes.length) {
      throw new Error('Cyclic dependency error detected in DAG');
    }

    return res;
  }
}

// ============================================================================
// 4. TERRAFORM STATE LOCK & PLAN ENGINE IMPLEMENTATION
// ============================================================================

export class MasterTerraformState {
  private activeLock: { id: string; holder: string } | null;
  private state: Map<string, any>;

  constructor() {
    this.activeLock = null;
    this.state = new Map();
  }

  public lock(holder: string): { ok: boolean; lockId: string | null } {
    if (this.activeLock !== null) return { ok: false, lockId: null };
    const lockId = `lock-${Date.now()}`;
    this.activeLock = { id: lockId, holder };
    return { ok: true, lockId };
  }

  public unlock(lockId: string): boolean {
    if (this.activeLock?.id === lockId) {
      this.activeLock = null;
      return true;
    }
    return false;
  }

  public forceUnlock(): void {
    this.activeLock = null;
  }

  public setState(id: string, attrs: any): void {
    this.state.set(id, attrs);
  }

  public getState(): Map<string, any> {
    return new Map(this.state);
  }
}

export class MasterPlanCalculator {
  public static plan(desired: Map<string, any>, current: Map<string, any>): Array<{ id: string; type: string }> {
    const diffs: Array<{ id: string; type: string }> = [];

    for (const [k, v] of desired.entries()) {
      if (!current.has(k)) {
        diffs.push({ id: k, type: 'ADD' });
      } else if (JSON.stringify(v) !== JSON.stringify(current.get(k))) {
        diffs.push({ id: k, type: 'UPDATE' });
      } else {
        diffs.push({ id: k, type: 'NO_OP' });
      }
    }

    for (const k of current.keys()) {
      if (!desired.has(k)) {
        diffs.push({ id: k, type: 'DESTROY' });
      }
    }

    return diffs;
  }
}

// ============================================================================
// 5. MASTER ASSESSMENT EXECUTION
// ============================================================================

async function runModule16Assessment(): Promise<void> {
  console.log('================================================================');
  console.log('🎓 MODULE 16 ASSESSMENT: CLOUD INFRASTRUCTURE & IAC TERRAFORM');
  console.log('================================================================');

  let passedTests = 0;
  const totalTests = 6;

  // TEST 1: AWS IAM Policy Evaluation & Deny Precedence
  console.log('\n[Suite 1/6] Menguji Evaluasi IAM Policy (Explicit Deny Precedence & Wildcard)...');
  const policy: IAMDoc = {
    statements: [
      {
        sid: 'AllowS3All',
        effect: 'Allow',
        action: ['s3:*'],
        resource: ['arn:aws:s3:::taskflow-prod-vault/*']
      },
      {
        sid: 'DenyDangerousDeletions',
        effect: 'Deny',
        action: ['s3:Delete*'],
        resource: ['arn:aws:s3:::taskflow-prod-vault/*']
      }
    ]
  };

  // 1. GetObject -> Allow
  const r1 = MasterIAMEvaluator.checkAccess(policy, 's3:GetObject', 'arn:aws:s3:::taskflow-prod-vault/db-dump.sql');
  assert.equal(r1.isAllowed, true);

  // 2. DeleteObject -> Deny (Deny overrides Allow)
  const r2 = MasterIAMEvaluator.checkAccess(policy, 's3:DeleteObject', 'arn:aws:s3:::taskflow-prod-vault/db-dump.sql');
  assert.equal(r2.isAllowed, false);
  assert.ok(r2.reason.includes('Explicit Deny'));

  // 3. Other Bucket -> Implicit Deny
  const r3 = MasterIAMEvaluator.checkAccess(policy, 's3:GetObject', 'arn:aws:s3:::unauthorized-bucket/file.txt');
  assert.equal(r3.isAllowed, false);
  assert.ok(r3.reason.includes('Implicit Deny'));
  passedTests++;
  console.log('  ✅ PASSED: Aturan evaluasi IAM (Allow, Deny Precedence, Implicit Deny) terverifikasi.');

  // TEST 2: Security Group Chaining (ALB -> ECS -> RDS)
  console.log('\n[Suite 2/6] Menguji Security Group Chaining & Isolasi Database...');
  const albSG = new MasterSecurityGroup('sg-alb');
  const ecsSG = new MasterSecurityGroup('sg-ecs');
  const rdsSG = new MasterSecurityGroup('sg-rds');

  albSG.addRule(443, { cidr: '0.0.0.0/0' }); // Public internet HTTPS
  ecsSG.addRule(3000, { sgId: 'sg-alb' }); // Only from ALB
  rdsSG.addRule(5432, { sgId: 'sg-ecs' }); // Only from ECS

  // Validasi alur sah
  assert.equal(albSG.allows(443, { cidr: '0.0.0.0/0' }), true);
  assert.equal(ecsSG.allows(3000, { sgId: 'sg-alb' }), true);
  assert.equal(rdsSG.allows(5432, { sgId: 'sg-ecs' }), true);

  // Validasi pemblokiran serangan langsung
  assert.equal(ecsSG.allows(3000, { cidr: '0.0.0.0/0' }), false);
  assert.equal(rdsSG.allows(5432, { cidr: '0.0.0.0/0' }), false);
  assert.equal(rdsSG.allows(5432, { sgId: 'sg-alb' }), false);
  passedTests++;
  console.log('  ✅ PASSED: Security Group chaining berhasil membatasi akses database hanya dari ECS.');

  // TEST 3: Terraform DAG Topological Dependency Resolution
  console.log('\n[Suite 3/6] Menguji Resolusi Dependensi Terraform DAG (Topological Sort)...');
  const infraNodes: InfraNode[] = [
    { id: 'aws_aurora.cluster', deps: ['aws_subnet.db_subnets', 'aws_security_group.db_sg'] },
    { id: 'aws_vpc.prod', deps: [] },
    { id: 'aws_subnet.db_subnets', deps: ['aws_vpc.prod'] },
    { id: 'aws_security_group.db_sg', deps: ['aws_vpc.prod'] }
  ];

  const order = MasterTerraformDAG.resolveOrder(infraNodes);
  assert.equal(order[0], 'aws_vpc.prod');
  const dbPos = order.indexOf('aws_aurora.cluster');
  const subnetPos = order.indexOf('aws_subnet.db_subnets');
  const sgPos = order.indexOf('aws_security_group.db_sg');
  assert.ok(dbPos > subnetPos);
  assert.ok(dbPos > sgPos);
  passedTests++;
  console.log('  ✅ PASSED: Topological DAG menjamin VPC dibuat sebelum subnet dan database.');

  // TEST 4: Terraform Circular Dependency Detection
  console.log('\n[Suite 4/6] Menguji Deteksi Siklus Dependensi Melingkar (Circular Error)...');
  const cyclicStack: InfraNode[] = [
    { id: 'module-auth', deps: ['module-task'] },
    { id: 'module-task', deps: ['module-auth'] }
  ];

  assert.throws(
    () => MasterTerraformDAG.resolveOrder(cyclicStack),
    /Cyclic dependency error/
  );
  passedTests++;
  console.log('  ✅ PASSED: Circular dependency berhasil digagalkan sebelum eksekusi plan.');

  // TEST 5: Terraform State Locking & Force-Unlock
  console.log('\n[Suite 5/6] Menguji State Locking & Force-Unlock Mechanism...');
  const stateMgr = new MasterTerraformState();

  const l1 = stateMgr.lock('ci-worker-1');
  assert.equal(l1.ok, true);

  // Worker 2 mencoba lock -> Gagal
  const l2 = stateMgr.lock('ci-worker-2');
  assert.equal(l2.ok, false);

  // Worker 1 force unlock
  stateMgr.forceUnlock();
  const l3 = stateMgr.lock('ci-worker-2');
  assert.equal(l3.ok, true);
  stateMgr.unlock(l3.lockId!);
  passedTests++;
  console.log('  ✅ PASSED: State collision berhasil dicegah dan force-unlock memulihkan kunci.');

  // TEST 6: Declarative Plan Diff Engine (+Add, ~Update, -Destroy)
  console.log('\n[Suite 6/6] Menguji Perhitungan Plan (+Add, ~Update, -Destroy)...');
  stateMgr.setState('aws_vpc.core', { cidr: '10.0.0.0/16' });
  stateMgr.setState('aws_db.primary', { size: 'db.t3.medium' });
  stateMgr.setState('aws_s3.temp', { name: 'tmp' });

  const desired = new Map<string, any>([
    ['aws_vpc.core', { cidr: '10.0.0.0/16' }], // NO_OP
    ['aws_db.primary', { size: 'db.r6g.xlarge' }], // UPDATE
    ['aws_redis.cache', { size: 'cache.t3.medium' }] // ADD
  ]); // aws_s3.temp tidak ada di desired -> DESTROY

  const planResults = MasterPlanCalculator.plan(desired, stateMgr.getState());
  const add = planResults.find(p => p.id === 'aws_redis.cache');
  const update = planResults.find(p => p.id === 'aws_db.primary');
  const destroy = planResults.find(p => p.id === 'aws_s3.temp');
  const noop = planResults.find(p => p.id === 'aws_vpc.core');

  assert.equal(add?.type, 'ADD');
  assert.equal(update?.type, 'UPDATE');
  assert.equal(destroy?.type, 'DESTROY');
  assert.equal(noop?.type, 'NO_OP');
  passedTests++;
  console.log('  ✅ PASSED: Plan diff engine akurat menghitung +1 ADD, ~1 UPDATE, -1 DESTROY.');

  // FINAL SCORING & CERTIFICATION
  console.log('\n================================================================');
  console.log(`📊 REKAPITULASI ASSESSMENT MODULE 16: ${passedTests}/${totalTests} SUITES PASSED`);
  const score = Math.round((passedTests / totalTests) * 100);
  console.log(`🎯 SKOR AKHIR: ${score}% (GRADE A)`);
  console.log('🏆 KELULUSAN RESMI: MODULE 16 DINYATAKAN LULUS (GRADE A)');
  console.log('🔓 MODULE 17 (OBSERVABILITY, DISTRIBUTED TRACING & SRE) RESMI DIBUKA!');
  console.log('================================================================\n');
}

runModule16Assessment().catch(err => {
  console.error('❌ Assessment failed with error:', err);
  process.exit(1);
});
