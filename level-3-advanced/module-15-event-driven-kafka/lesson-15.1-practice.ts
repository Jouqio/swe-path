/**
 * lesson-15.1-practice.ts
 *
 * Distributed Event Streaming Practice (Apache Kafka Emulator):
 * 1. Partitioned Topics & Append-Only Commit Log
 * 2. Deterministic Partition Key Hashing
 * 3. Strict Sequential Ordering per Partition
 * 4. Independent Multi-Consumer Group Fanout
 *
 * Execution: node --experimental-strip-types lesson-15.1-practice.ts
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// ============================================================================
// 1. KAFKA COMMIT LOG & PARTITIONED TOPIC ENGINE
// ============================================================================

export interface KafkaMessage {
  key: string | null;
  value: Record<string, unknown>;
  timestamp: number;
  offset: number;
}

export class PartitionLog {
  public messages: KafkaMessage[];

  constructor() {
    this.messages = [];
  }

  public append(key: string | null, value: Record<string, unknown>): KafkaMessage {
    const offset = this.messages.length;
    const msg: KafkaMessage = {
      key,
      value,
      timestamp: Date.now(),
      offset
    };
    this.messages.push(msg);
    return msg;
  }

  public fetch(fromOffset: number, maxMessages = 10): KafkaMessage[] {
    return this.messages.slice(fromOffset, fromOffset + maxMessages);
  }

  public size(): number {
    return this.messages.length;
  }
}

export class DistributedKafkaTopic {
  public readonly name: string;
  public readonly partitionCount: number;
  private partitions: PartitionLog[];

  constructor(name: string, partitionCount: number) {
    this.name = name;
    this.partitionCount = partitionCount;
    this.partitions = [];
    for (let i = 0; i < partitionCount; i++) {
      this.partitions.push(new PartitionLog());
    }
  }

  public getPartitionIndex(key: string | null): number {
    if (!key) return 0;
    const hash = createHash('md5').update(key).digest('hex');
    const num = parseInt(hash.slice(0, 8), 16);
    return num % this.partitionCount;
  }

  public produce(key: string | null, value: Record<string, unknown>): { partition: number; offset: number } {
    const partitionIndex = this.getPartitionIndex(key);
    const msg = this.partitions[partitionIndex].append(key, value);
    return { partition: partitionIndex, offset: msg.offset };
  }

  public read(partitionIndex: number, offset: number, limit = 10): KafkaMessage[] {
    if (partitionIndex < 0 || partitionIndex >= this.partitionCount) {
      throw new Error(`Partition ${partitionIndex} invalid`);
    }
    return this.partitions[partitionIndex].fetch(offset, limit);
  }

  public getPartition(index: number): PartitionLog {
    return this.partitions[index];
  }
}

// ============================================================================
// 2. CONSUMER GROUP & INDEPENDENT OFFSET MANAGEMENT
// ============================================================================

export class EventConsumerGroup {
  public readonly groupId: string;
  private offsets: Map<string, Map<number, number>>;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.offsets = new Map();
  }

  public getCommittedOffset(topic: string, partition: number): number {
    return this.offsets.get(topic)?.get(partition) || 0;
  }

  public commitOffset(topic: string, partition: number, nextOffset: number): void {
    if (!this.offsets.has(topic)) {
      this.offsets.set(topic, new Map());
    }
    this.offsets.get(topic)!.set(partition, nextOffset);
  }

  public poll(
    topic: DistributedKafkaTopic,
    partition: number,
    processor: (msg: KafkaMessage) => void
  ): number {
    const currentOffset = this.getCommittedOffset(topic.name, partition);
    const batch = topic.read(partition, currentOffset, 10);

    for (const msg of batch) {
      processor(msg);
      this.commitOffset(topic.name, partition, msg.offset + 1);
    }

    return batch.length;
  }
}

// ============================================================================
// 3. AUTOMATED VERIFICATION & PRACTICE RUNNER
// ============================================================================

export async function runPractice(): Promise<void> {
  console.log('🚀 [SIMULASI DISTRIBUTED EVENT STREAMING (KAFKA)]');

  // Topic 3 partisi
  const topic = new DistributedKafkaTopic('taskflow.tasks', 3);

  // Test 1: Deterministic Partition Key Hashing
  console.log('\n--- 1. Verifikasi Partisi Deterministik & Jaminan Ordering ---');
  const wsKey = 'workspace-alpha-123';
  const expectedPartition = topic.getPartitionIndex(wsKey);
  console.log(`Key "${wsKey}" dipetakan secara deterministik ke Partisi: ${expectedPartition}`);

  // Kirim 3 event untuk workspace yang sama
  const p1 = topic.produce(wsKey, { event: 'TASK_CREATED', id: 't-1', status: 'TODO' });
  const p2 = topic.produce(wsKey, { event: 'TASK_UPDATED', id: 't-1', status: 'IN_PROGRESS' });
  const p3 = topic.produce(wsKey, { event: 'TASK_COMPLETED', id: 't-1', status: 'DONE' });

  assert.equal(p1.partition, expectedPartition);
  assert.equal(p2.partition, expectedPartition);
  assert.equal(p3.partition, expectedPartition);
  assert.equal(p1.offset, 0);
  assert.equal(p2.offset, 1);
  assert.equal(p3.offset, 2);
  console.log('✅ Terbukti: Ketiga event masuk ke partisi yang SAMA dengan offset berurutan (0 -> 1 -> 2).');

  // Test 2: Consumer Group Membaca Secara Berurutan & Commit Offset
  console.log('\n--- 2. Verifikasi Konsumsi Sequential & Offset Commit ---');
  const notifGroup = new EventConsumerGroup('notification-service');
  const processedStatuses: string[] = [];

  const processedCount = notifGroup.poll(topic, expectedPartition, (msg) => {
    processedStatuses.push((msg.value as any).status);
  });

  assert.equal(processedCount, 3);
  assert.deepEqual(processedStatuses, ['TODO', 'IN_PROGRESS', 'DONE']);
  assert.equal(notifGroup.getCommittedOffset(topic.name, expectedPartition), 3);
  console.log('✅ Consumer Group berhasil memproses event sesuai urutan kronologis tepat: TODO -> IN_PROGRESS -> DONE.');
  console.log(`✅ Offset bookmark ter-commit di posisi: ${notifGroup.getCommittedOffset(topic.name, expectedPartition)}.`);

  // Test 3: Polling saat tidak ada pesan baru
  const emptyPoll = notifGroup.poll(topic, expectedPartition, () => {});
  assert.equal(emptyPoll, 0, 'Polling harus 0 pesan karena offset sudah berada di ujung log');
  console.log('✅ Polling berikutnya mengembalikan 0 pesan (tidak ada duplikasi baca).');

  // Test 4: Multi-Consumer Group Fanout (Audit Group membaca stream yang sama)
  console.log('\n--- 3. Verifikasi Fanout: Multiple Consumer Groups Membaca Independen ---');
  const auditGroup = new EventConsumerGroup('audit-service');
  const auditEvents: string[] = [];

  // Audit group baru saja dibuat, offsetnya masih di 0
  assert.equal(auditGroup.getCommittedOffset(topic.name, expectedPartition), 0);

  auditGroup.poll(topic, expectedPartition, (msg) => {
    auditEvents.push((msg.value as any).event);
  });

  assert.deepEqual(auditEvents, ['TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED']);
  assert.equal(auditGroup.getCommittedOffset(topic.name, expectedPartition), 3);
  console.log('✅ Audit Service membaca ulang seluruh event dari offset 0 tanpa mengganggu Notification Service!');

  // Test 5: Distribusi Multi-Partisi
  console.log('\n--- 4. Verifikasi Distribusi Beban Lintas Partisi ---');
  // Kirim event dengan kunci workspace berbeda
  const otherKeys = ['workspace-beta-456', 'workspace-gamma-789', 'workspace-delta-000'];
  const partitionsUsed = new Set<number>();
  partitionsUsed.add(expectedPartition);

  for (const k of otherKeys) {
    const res = topic.produce(k, { event: 'PING' });
    partitionsUsed.add(res.partition);
  }

  assert.ok(partitionsUsed.size > 1, 'Event dengan key berbeda harus terdistribusi ke beberapa partisi');
  console.log(`✅ Event tersebar ke ${partitionsUsed.size} partisi berbeda untuk penskalaan paralel.`);

  console.log('\n======================================================');
  console.log('🎉 SEMUA TES KAFKA EVENT STREAMING 100% SUKSES!');
  console.log('======================================================');
}

runPractice().catch(err => {
  console.error('Fatal error in Kafka practice:', err);
  process.exit(1);
});
