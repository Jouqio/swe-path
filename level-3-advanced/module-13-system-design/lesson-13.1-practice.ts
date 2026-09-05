/**
 * lesson-13.1-practice.ts
 *
 * Distributed Systems Simulation:
 * 1. Quorum Consistency Engine (W + R > N proof)
 * 2. Network Partition Simulation (CAP Theorem Behavior)
 * 3. Transactional Outbox Pattern to prevent Dual-Write Inconsistencies
 *
 * Execution: node --experimental-strip-types lesson-13.1-practice.ts
 */

import assert from 'node:assert/strict';

// ============================================================================
// 1. REPLICA NODE & QUORUM CONSISTENCY ENGINE
// ============================================================================

export interface DataRecord {
  key: string;
  value: string;
  version: number;
  timestamp: number;
}

export class ReplicaNode {
  public readonly id: string;
  public isPartitioned: boolean;
  private storage: Map<string, DataRecord>;

  constructor(id: string) {
    this.id = id;
    this.isPartitioned = false;
    this.storage = new Map<string, DataRecord>();
  }

  public write(record: DataRecord): boolean {
    if (this.isPartitioned) {
      return false; // Jaringan putus: node tidak menerima write
    }
    const current = this.storage.get(record.key);
    if (!current || record.version >= current.version) {
      this.storage.set(record.key, { ...record });
      return true;
    }
    return false;
  }

  public read(key: string): DataRecord | null {
    if (this.isPartitioned) {
      return null; // Jaringan putus: node tidak bisa dihubungi
    }
    return this.storage.get(key) || null;
  }

  public getRawStorage(): Map<string, DataRecord> {
    return new Map(this.storage);
  }
}

export class DistributedDataCluster {
  private nodes: ReplicaNode[];

  constructor(nodeCount: number) {
    this.nodes = [];
    for (let i = 1; i <= nodeCount; i++) {
      this.nodes.push(new ReplicaNode(`node-${i}`));
    }
  }

  public getNodes(): ReplicaNode[] {
    return this.nodes;
  }

  public getNode(id: string): ReplicaNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  /**
   * Quorum Write: Menulis ke semua node yang dapat dihubungi.
   * Sukses jika acks >= W (Write Quorum).
   */
  public writeQuorum(
    key: string,
    value: string,
    version: number,
    W: number
  ): { success: boolean; acks: number; nodesAcknowledged: string[] } {
    const record: DataRecord = { key, value, version, timestamp: Date.now() };
    const acks: string[] = [];

    for (const node of this.nodes) {
      if (node.write(record)) {
        acks.push(node.id);
      }
    }

    return {
      success: acks.length >= W,
      acks: acks.length,
      nodesAcknowledged: acks
    };
  }

  /**
   * Quorum Read: Membaca dari semua node yang dapat dihubungi.
   * Sukses jika responses >= R (Read Quorum).
   * Mengembalikan data dengan versi tertinggi (Last-Write-Wins / highest version).
   */
  public readQuorum(
    key: string,
    R: number
  ): { value: string | null; version: number; success: boolean; responses: number } {
    let responses = 0;
    let highestRecord: DataRecord | null = null;

    for (const node of this.nodes) {
      const res = node.read(key);
      if (res !== null) {
        responses++;
        if (!highestRecord || res.version > highestRecord.version) {
          highestRecord = res;
        }
      }
    }

    if (responses >= R && highestRecord) {
      return {
        value: highestRecord.value,
        version: highestRecord.version,
        success: true,
        responses
      };
    }

    return {
      value: null,
      version: 0,
      success: false,
      responses
    };
  }

  /**
   * Mensimulasikan Network Partition: Mengisolasi kumpulan node tertentu.
   */
  public partitionNodes(partitionedIds: string[]): void {
    for (const node of this.nodes) {
      if (partitionedIds.includes(node.id)) {
        node.isPartitioned = true;
      }
    }
  }

  /**
   * Memulihkan jaringan ke semua node.
   */
  public healNetwork(): void {
    for (const node of this.nodes) {
      node.isPartitioned = false;
    }
  }
}

// ============================================================================
// 2. TRANSACTIONAL OUTBOX PATTERN SIMULATOR
// ============================================================================

export interface OutboxEvent {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: number;
  published: boolean;
}

export interface TaskEntity {
  id: string;
  title: string;
  assigneeId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export class TaskServiceWithOutbox {
  // Simulasi tabel database lokal dalam 1 transaksi ACID
  private tasksTable: Map<string, TaskEntity> = new Map();
  private outboxTable: OutboxEvent[] = [];

  /**
   * Melakukan state mutation dan membuat outbox event dalam 1 atomic transaction.
   */
  public assignTask(taskId: string, title: string, assigneeId: string): { task: TaskEntity; eventId: string } {
    const task: TaskEntity = {
      id: taskId,
      title,
      assigneeId,
      status: 'IN_PROGRESS'
    };

    const outboxEvent: OutboxEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      aggregateType: 'TASK',
      aggregateId: taskId,
      eventType: 'TASK_ASSIGNED',
      payload: { taskId, assigneeId, title },
      createdAt: Date.now(),
      published: false
    };

    // Atomic write ke DB lokal
    this.tasksTable.set(taskId, task);
    this.outboxTable.push(outboxEvent);

    return { task, eventId: outboxEvent.id };
  }

  public getPendingOutboxEvents(): OutboxEvent[] {
    return this.outboxTable.filter(e => !e.published);
  }

  public markEventPublished(eventId: string): void {
    const evt = this.outboxTable.find(e => e.id === eventId);
    if (evt) {
      evt.published = true;
    }
  }

  public getTask(id: string): TaskEntity | undefined {
    return this.tasksTable.get(id);
  }
}

export class NotificationConsumer {
  public processedEventIds: Set<string> = new Set();
  public receivedNotifications: Array<{ userId: string; text: string }> = [];

  /**
   * Idempotent Event Consumer: Mencegah notifikasi ganda jika event dipublish berulang kali.
   */
  public handleEvent(event: OutboxEvent): boolean {
    if (this.processedEventIds.has(event.id)) {
      // Event sudah pernah diproses -> Idempotent skip
      return false;
    }

    if (event.eventType === 'TASK_ASSIGNED') {
      const payload = event.payload as { taskId: string; assigneeId: string; title: string };
      this.receivedNotifications.push({
        userId: payload.assigneeId,
        text: `Task "${payload.title}" (${payload.taskId}) telah ditugaskan ke Anda.`
      });
      this.processedEventIds.add(event.id);
      return true;
    }

    return false;
  }
}

// ============================================================================
// 3. AUTOMATED VERIFICATION & TEST RUNNER
// ============================================================================

export function runPracticeSimulation(): void {
  console.log('🚀 [SIMULASI DISTRIBUTED SYSTEMS & QUORUM CONSISTENCY]');

  // Kasus 1: Strong Consistency Quorum (N = 5, W = 3, R = 3 => W + R = 6 > 5)
  console.log('\n--- 1. Verifikasi Quorum Strong Consistency (N=5, W=3, R=3) ---');
  const cluster = new DistributedDataCluster(5);

  const write1 = cluster.writeQuorum('task:42:status', 'IN_PROGRESS', 1, 3);
  assert.equal(write1.success, true, 'Write Quorum harus sukses dengan minimal 3 node');
  assert.equal(write1.acks, 5, 'Semua 5 node sehat harus menerima write');
  console.log(`✅ Write v1 sukses: Acks = ${write1.acks}/5 nodes.`);

  const read1 = cluster.readQuorum('task:42:status', 3);
  assert.equal(read1.success, true);
  assert.equal(read1.value, 'IN_PROGRESS');
  assert.equal(read1.version, 1);
  console.log(`✅ Read Quorum v1 konsisten: Value = "${read1.value}" (v${read1.version}) dari ${read1.responses} respons.`);

  // Kasus 2: Network Partition (2 Node mati/terisolasi)
  console.log('\n--- 2. Simulasi Network Partition (Node-4 dan Node-5 Terputus) ---');
  cluster.partitionNodes(['node-4', 'node-5']);

  // Write v2 saat 2 node putus
  const write2 = cluster.writeQuorum('task:42:status', 'COMPLETED', 2, 3);
  assert.equal(write2.success, true, 'Write harus tetap sukses karena 3 node (node-1,2,3) masih hidup');
  assert.equal(write2.acks, 3);
  console.log(`✅ Write v2 berhasil di 3 node aktif: Acks = ${write2.acks}/3 (Node 4 & 5 terpartisi).`);

  // Read v2 saat 2 node putus
  const read2 = cluster.readQuorum('task:42:status', 3);
  assert.equal(read2.success, true);
  assert.equal(read2.value, 'COMPLETED');
  assert.equal(read2.version, 2);
  console.log(`✅ Read v2 menghasilkan data terbaru "${read2.value}" (Strong Consistency terbukti!).`);

  // Kasus 3: Network Partition Ekstrem (3 Node putus, hanya tersisa 2 node)
  console.log('\n--- 3. Simulasi Partition Ekstrem (Node-3 juga terputus, tersisa 2 node) ---');
  cluster.partitionNodes(['node-3']); // Sekarang node-3, node-4, node-5 putus

  const write3 = cluster.writeQuorum('task:42:status', 'ARCHIVED', 3, 3);
  assert.equal(write3.success, false, 'Write Quorum GAGAL karena hanya 2 node yang ack (< W=3)');
  assert.equal(write3.acks, 2);
  console.log(`⚠️ CP Behavior Terbukti: Write ditolak demi mencegah split-brain (Acks = ${write3.acks} < W=3).`);

  // Pulihkan Jaringan
  cluster.healNetwork();
  console.log('🌐 Jaringan seluruh node dipulihkan.');

  // Kasus 4: Transactional Outbox Pattern & Idempotent Consumer
  console.log('\n--- 4. Simulasi Transactional Outbox & Idempotent Consumer ---');
  const taskService = new TaskServiceWithOutbox();
  const notifConsumer = new NotificationConsumer();

  const { task, eventId } = taskService.assignTask('task-99', 'Migrate to Microservices', 'engineer-007');
  assert.equal(task.status, 'IN_PROGRESS');

  const pendingEvents = taskService.getPendingOutboxEvents();
  assert.equal(pendingEvents.length, 1);
  assert.equal(pendingEvents[0].id, eventId);
  console.log(`✅ Atomic Outbox record tersimpan di database lokal: Event ID = ${eventId}`);

  // Simulasi background worker mengirim event ke consumer
  const eventToPublish = pendingEvents[0];
  const handledFirst = notifConsumer.handleEvent(eventToPublish);
  assert.equal(handledFirst, true);
  taskService.markEventPublished(eventId);
  console.log(`✅ Event diproses pertama kali oleh consumer: Notifikasi terkirim.`);

  // Simulasi Network Retry: Worker mencoba mem-publish event yang sama lagi
  const handledDuplicate = notifConsumer.handleEvent(eventToPublish);
  assert.equal(handledDuplicate, false, 'Consumer harus menolak event duplikat');
  assert.equal(notifConsumer.receivedNotifications.length, 1, 'Hanya boleh ada 1 notifikasi terkirim');
  console.log(`🛡️ Idempotent consumer berhasil mengabaikan event duplikat! Total notifikasi = 1.`);

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES DISTRIBUTED SYSTEMS & SIMULASI 100% SUKSES!');
  console.log('======================================================');
}

// Jalankan jika file dieksekusi langsung
runPracticeSimulation();
