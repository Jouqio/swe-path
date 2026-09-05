/**
 * src/events/event-backbone.ts
 *
 * Distributed Event Streaming Backbone (Apache Kafka Emulator):
 * - Partitioned Append-Only Commit Logs
 * - Deterministic Key Hashing (Strict Ordering per Workspace)
 * - Consumer Groups with Independent Offset Tracking
 */

import { createHash } from 'node:crypto';

export interface EventEnvelope {
  key: string | null;
  payload: Record<string, unknown>;
  timestamp: number;
  offset: number;
}

export class PartitionLog {
  public messages: EventEnvelope[];

  constructor() {
    this.messages = [];
  }

  public append(key: string | null, payload: Record<string, unknown>): EventEnvelope {
    const offset = this.messages.length;
    const item: EventEnvelope = {
      key,
      payload,
      timestamp: Date.now(),
      offset
    };
    this.messages.push(item);
    return item;
  }

  public slice(fromOffset: number, count = 10): EventEnvelope[] {
    return this.messages.slice(fromOffset, fromOffset + count);
  }
}

export class KafkaTopicCluster {
  public readonly topicName: string;
  public readonly partitionCount: number;
  private partitions: PartitionLog[];

  constructor(topicName: string, partitionCount = 3) {
    this.topicName = topicName;
    this.partitionCount = partitionCount;
    this.partitions = [];
    for (let i = 0; i < partitionCount; i++) {
      this.partitions.push(new PartitionLog());
    }
  }

  public computePartition(key: string | null): number {
    if (!key) return 0;
    const hash = createHash('md5').update(key).digest('hex');
    const num = parseInt(hash.slice(0, 8), 16);
    return num % this.partitionCount;
  }

  public produce(key: string | null, payload: Record<string, unknown>): { partition: number; offset: number } {
    const p = this.computePartition(key);
    const envelope = this.partitions[p].append(key, payload);
    return { partition: p, offset: envelope.offset };
  }

  public fetchRecords(partition: number, fromOffset: number, limit = 10): EventEnvelope[] {
    if (partition < 0 || partition >= this.partitionCount) {
      throw new Error(`Partition ${partition} does not exist`);
    }
    return this.partitions[partition].slice(fromOffset, limit);
  }
}

export class KafkaConsumerGroup {
  public readonly groupId: string;
  private offsets: Map<number, number>;

  constructor(groupId: string) {
    this.groupId = groupId;
    this.offsets = new Map();
  }

  public getOffset(partition: number): number {
    return this.offsets.get(partition) || 0;
  }

  public commitOffset(partition: number, nextOffset: number): void {
    this.offsets.set(partition, nextOffset);
  }

  public poll(topic: KafkaTopicCluster, partition: number, handler: (event: EventEnvelope) => void): number {
    const curOffset = this.getOffset(partition);
    const records = topic.fetchRecords(partition, curOffset, 20);

    for (const record of records) {
      handler(record);
      this.commitOffset(partition, record.offset + 1);
    }

    return records.length;
  }
}
