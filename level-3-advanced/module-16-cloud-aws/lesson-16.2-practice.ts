/**
 * lesson-16.2-practice.ts
 *
 * Infrastructure as Code (IaC) Engine & Terraform Simulator:
 * 1. Directed Acyclic Graph (DAG) Resource Topological Sorting
 * 2. Circular Dependency Detection & Cycle Prevention
 * 3. Remote State Locking & Force-Unlock Mechanism (DynamoDB Simulation)
 * 4. Declarative Plan Engine: State Diff Calculation (+Add, ~Update, -Destroy)
 *
 * Execution: node --experimental-strip-types lesson-16.2-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. TERRAFORM DIRECTED ACYCLIC GRAPH (DAG) RESOLVER
// ============================================================================

export interface ResourceDefinition {
  id: string;
  dependencies: string[];
}

export class TerraformDAGResolver {
  public static resolve(nodes: ResourceDefinition[]): string[] {
    const inDegree: Map<string, number> = new Map();
    const adjList: Map<string, string[]> = new Map();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    for (const node of nodes) {
      for (const dep of node.dependencies) {
        if (!adjList.has(dep)) {
          throw new Error(`Unresolved dependency: [${node.id}] depends on non-existent [${dep}]`);
        }
        adjList.get(dep)!.push(node.id);
        inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(id);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      result.push(curr);

      for (const neighbor of adjList.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length !== nodes.length) {
      throw new Error('Cyclic dependency detected in Terraform configuration!');
    }

    return result;
  }
}

// ============================================================================
// 2. REMOTE STATE & DYNAMODB LOCKING SIMULATOR
// ============================================================================

export interface StateLockInfo {
  lockId: string;
  who: string;
  operation: string;
  created: number;
}

export class TerraformStateManager {
  private currentState: Map<string, Record<string, unknown>>;
  private lockTable: StateLockInfo | null;

  constructor() {
    this.currentState = new Map();
    this.lockTable = null;
  }

  public acquireLock(who: string, operation: string): { success: boolean; lockId: string | null; error?: string } {
    if (this.lockTable !== null) {
      return {
        success: false,
        lockId: null,
        error: `Error acquiring the state lock: Resource locked by [${this.lockTable.who}] for [${this.lockTable.operation}]`
      };
    }

    const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.lockTable = {
      lockId,
      who,
      operation,
      created: Date.now()
    };

    return { success: true, lockId };
  }

  public releaseLock(lockId: string): boolean {
    if (this.lockTable && this.lockTable.lockId === lockId) {
      this.lockTable = null;
      return true;
    }
    return false;
  }

  public forceUnlock(lockId: string): boolean {
    if (this.lockTable && this.lockTable.lockId === lockId) {
      this.lockTable = null;
      return true;
    }
    return false;
  }

  public getRawState(): Map<string, Record<string, unknown>> {
    return new Map(this.currentState);
  }

  public applyState(resourceId: string, attributes: Record<string, unknown>): void {
    this.currentState.set(resourceId, { ...attributes });
  }

  public destroyState(resourceId: string): void {
    this.currentState.delete(resourceId);
  }
}

// ============================================================================
// 3. DECLARATIVE DIFF PLAN ENGINE
// ============================================================================

export type PlanAction = 'ADD' | 'UPDATE' | 'DESTROY' | 'NO_OP';

export interface PlanDiff {
  resourceId: string;
  action: PlanAction;
  details: string;
}

export class TerraformPlanEngine {
  public static computePlan(
    desiredConfig: Map<string, Record<string, unknown>>,
    currentState: Map<string, Record<string, unknown>>
  ): PlanDiff[] {
    const diffs: PlanDiff[] = [];

    // 1. Cek resource baru (+ADD) atau yang diperbarui (~UPDATE)
    for (const [id, desiredAttrs] of desiredConfig.entries()) {
      if (!currentState.has(id)) {
        diffs.push({ resourceId: id, action: 'ADD', details: '+ Resource will be created' });
      } else {
        const currentAttrs = currentState.get(id)!;
        const hasDiff = JSON.stringify(desiredAttrs) !== JSON.stringify(currentAttrs);
        if (hasDiff) {
          diffs.push({ resourceId: id, action: 'UPDATE', details: '~ Attributes will be modified in-place' });
        } else {
          diffs.push({ resourceId: id, action: 'NO_OP', details: 'No changes' });
        }
      }
    }

    // 2. Cek resource yang dihapus dari kode (-DESTROY)
    for (const id of currentState.keys()) {
      if (!desiredConfig.has(id)) {
        diffs.push({ resourceId: id, action: 'DESTROY', details: '- Resource will be deleted' });
      }
    }

    return diffs;
  }
}

// ============================================================================
// 4. AUTOMATED VERIFICATION & PRACTICE RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI TERRAFORM IAC & DEPENDENCY DAG ENGINE]');

  // Test 1: Topological Sort Resolusi Dependensi Infrastruktur
  console.log('\n--- 1. Verifikasi DAG Topological Sort Dependensi Infrastruktur ---');
  const infraStack: ResourceDefinition[] = [
    { id: 'aws_db_instance.postgres', dependencies: ['aws_subnet.db_subnet', 'aws_security_group.db_sg'] },
    { id: 'aws_vpc.main', dependencies: [] },
    { id: 'aws_subnet.db_subnet', dependencies: ['aws_vpc.main'] },
    { id: 'aws_security_group.db_sg', dependencies: ['aws_vpc.main'] },
    { id: 'aws_ecs_cluster.app', dependencies: ['aws_vpc.main'] }
  ];

  const order = TerraformDAGResolver.resolve(infraStack);
  console.log('Urutan Eksekusi Otomatis:', order.join(' -> '));

  // Validasi: VPC harus dibuat paling pertama
  assert.equal(order[0], 'aws_vpc.main');
  // Validasi: Database harus dibuat setelah Subnet dan Security Group
  const dbIndex = order.indexOf('aws_db_instance.postgres');
  const subnetIndex = order.indexOf('aws_subnet.db_subnet');
  const sgIndex = order.indexOf('aws_security_group.db_sg');
  assert.ok(dbIndex > subnetIndex, 'Database harus dibuat setelah subnet');
  assert.ok(dbIndex > sgIndex, 'Database harus dibuat setelah security group');
  console.log('✅ Topological DAG berhasil menjamin urutan dependensi valid!');

  // Test 2: Deteksi Circular Dependency
  console.log('\n--- 2. Verifikasi Deteksi Siklus Melingkar (Circular Dependency) ---');
  const cyclicStack: ResourceDefinition[] = [
    { id: 'res-A', dependencies: ['res-B'] },
    { id: 'res-B', dependencies: ['res-C'] },
    { id: 'res-C', dependencies: ['res-A'] } // Siklus A -> B -> C -> A
  ];

  assert.throws(
    () => TerraformDAGResolver.resolve(cyclicStack),
    /Cyclic dependency detected/
  );
  console.log('🛡️ Siklus melingkar berhasil dideteksi dan digagalkan sebelum eksekusi.');

  // Test 3: Remote State Locking via DynamoDB
  console.log('\n--- 3. Verifikasi State Locking & Force-Unlock ---');
  const stateMgr = new TerraformStateManager();

  // CI Pipeline 1 mengambil lock
  const lock1 = stateMgr.acquireLock('github-actions-ci-1', 'terraform-apply');
  assert.equal(lock1.success, true);
  console.log(`✅ Lock berhasil diambil oleh CI 1: ${lock1.lockId}`);

  // CI Pipeline 2 mencoba mengambil lock bersamaan -> GAGAL
  const lock2 = stateMgr.acquireLock('developer-laptop-2', 'terraform-apply');
  assert.equal(lock2.success, false);
  assert.ok(lock2.error?.includes('github-actions-ci-1'));
  console.log('🛡️ CI 2 ditolak secara aman: State collision berhasil dicegah.');

  // Simulasi CI 1 crash meninggalkan lock, jalankan force-unlock
  const forceRes = stateMgr.forceUnlock(lock1.lockId!);
  assert.equal(forceRes, true);
  console.log('🔧 terraform force-unlock berhasil melepaskan kunci yang macet.');

  // CI 2 kini bisa mengambil lock
  const lock2Retry = stateMgr.acquireLock('developer-laptop-2', 'terraform-apply');
  assert.equal(lock2Retry.success, true);
  console.log('✅ Lock berhasil diakuisisi ulang setelah force-unlock.');
  stateMgr.releaseLock(lock2Retry.lockId!);

  // Test 4: Declarative Plan Engine (+Add, ~Update, -Destroy)
  console.log('\n--- 4. Verifikasi Declarative Plan Diff Engine ---');
  // State awal: sudah ada VPC dan database versi kecil
  stateMgr.applyState('aws_vpc.main', { cidr: '10.0.0.0/16' });
  stateMgr.applyState('aws_db_instance.main', { instance_class: 'db.t3.medium' });
  stateMgr.applyState('aws_s3_bucket.legacy', { name: 'old-backup' });

  // Desired Config baru dari kode .tf:
  // - VPC tidak berubah (NO_OP)
  // - Database di-upgrade ke db.r6g.large (~UPDATE)
  // - Ditambahkan Redis cluster (+ADD)
  // - S3 legacy dihapus dari file (-DESTROY)
  const desiredConfig = new Map<string, Record<string, unknown>>([
    ['aws_vpc.main', { cidr: '10.0.0.0/16' }],
    ['aws_db_instance.main', { instance_class: 'db.r6g.large' }],
    ['aws_elasticache_cluster.redis', { node_type: 'cache.r6g.large' }]
  ]);

  const plan = TerraformPlanEngine.computePlan(desiredConfig, stateMgr.getRawState());
  const addAction = plan.find(p => p.resourceId === 'aws_elasticache_cluster.redis');
  const updateAction = plan.find(p => p.resourceId === 'aws_db_instance.main');
  const destroyAction = plan.find(p => p.resourceId === 'aws_s3_bucket.legacy');
  const noopAction = plan.find(p => p.resourceId === 'aws_vpc.main');

  assert.equal(addAction?.action, 'ADD');
  assert.equal(updateAction?.action, 'UPDATE');
  assert.equal(destroyAction?.action, 'DESTROY');
  assert.equal(noopAction?.action, 'NO_OP');
  console.log('✅ Terraform Plan terverifikasi: +1 to add, ~1 to change, -1 to destroy.');

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES TERRAFORM IAC & DAG ENGINE 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in Terraform practice:', err);
  process.exit(1);
});
