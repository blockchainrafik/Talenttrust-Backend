/**
 * Queue Manager
 * 
 * Central manager for creating and managing BullMQ queues and workers.
 * Provides a unified interface for job enqueueing and processing.
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import { queueConfig } from './config';
import { JobType, JobPayload, JobResult, AddJobOptions, AddJobResult } from './types';
import { jobProcessors } from './processors';

/**
 * QueueManager handles queue lifecycle and job processing
 * Implements singleton pattern to ensure single Redis connection pool
 */
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();
  private queueEvents: Map<JobType, QueueEvents> = new Map();
  private isShuttingDown = false;

  private constructor() {}

  /**
   * Get singleton instance of QueueManager
   */
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Initialize a queue for a specific job type
   * Creates queue, worker, and event listeners
   * 
   * @param jobType - Type of job this queue will handle
   * @throws Error if queue initialization fails
   */
  public async initializeQueue(jobType: JobType): Promise<void> {
    if (this.queues.has(jobType)) {
      return;
    }

    const queue = new Queue(jobType, {
      connection: queueConfig.redis,
      defaultJobOptions: queueConfig.defaultJobOptions,
    });

    const worker = new Worker(
      jobType,
      async (job: Job) => {
        return this.processJob(jobType, job);
      },
      {
        connection: queueConfig.redis,
        concurrency: 5,
      }
    );

    const queueEvents = new QueueEvents(jobType, {
      connection: queueConfig.redis,
    });

    this.setupEventListeners(jobType, worker, queueEvents);

    this.queues.set(jobType, queue);
    this.workers.set(jobType, worker);
    this.queueEvents.set(jobType, queueEvents);
  }

  /**
   * Add a job to the queue with optional idempotency via a dedupe key.
   *
   * When dedupeKey is supplied, BullMQ will not create a new job if one with
   * that key is already waiting, active, or delayed. An optional dedupeTtl
   * (ms) keeps the key alive after completion to suppress re-enqueue during
   * that window. The returned AddJobResult.deduplicated flag indicates whether
   * an existing job was reused.
   *
   * @param jobType - Type of job to enqueue
   * @param payload - Job-specific data payload
   * @param options - Scheduling and deduplication options
   * @returns { jobId, deduplicated }
   * @throws Error if queue not initialized or job addition fails
   */
  public async addJob(
    jobType: JobType,
    payload: JobPayload,
    options?: AddJobOptions
  ): Promise<AddJobResult> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for ${jobType} not initialized`);
    }

    const { priority, delay, dedupeKey, dedupeTtl } = options ?? {};

    const bullOptions: JobsOptions = { priority, delay };

    if (dedupeKey) {
      bullOptions.jobId = dedupeKey;
      bullOptions.deduplication = {
        id: dedupeKey,
        ...(dedupeTtl !== undefined && { ttl: dedupeTtl }),
      };
    }

    // Pre-check: determine if an active/waiting/delayed job already exists.
    // TOCTOU window exists here, but queue.add() deduplication is the hard
    // guarantee — this pre-check is only for setting the response flag.
    let deduplicated = false;
    if (dedupeKey) {
      const existing = await queue.getJob(dedupeKey);
      if (existing) {
        const state = await existing.getState();
        deduplicated = !['completed', 'failed', 'unknown'].includes(state);
      }
    }

    const job = await queue.add(jobType, payload, bullOptions);
    return { jobId: job.id!, deduplicated };
  }

  /**
   * Process a job using the appropriate processor
   * 
   * @param jobType - Type of job being processed
   * @param job - BullMQ job instance
   * @returns Processing result
   */
  private async processJob(jobType: JobType, job: Job): Promise<JobResult> {
    const processor = jobProcessors[jobType];
    if (!processor) {
      throw new Error(`No processor found for job type: ${jobType}`);
    }

    try {
      return await processor(job.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Job processing failed: ${errorMessage}`);
    }
  }

  /**
   * Setup event listeners for monitoring and logging
   */
  private setupEventListeners(
    jobType: JobType,
    worker: Worker,
    queueEvents: QueueEvents
  ): void {
    worker.on('completed', (job: Job, result: JobResult) => {
      console.log(`[${jobType}] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      console.error(`[${jobType}] Job ${job?.id} failed:`, error.message);
    });

    queueEvents.on('waiting', ({ jobId }: { jobId: string | undefined }) => {
      console.log(`[${jobType}] Job ${jobId} is waiting`);
    });

    queueEvents.on('active', ({ jobId }: { jobId: string | undefined }) => {
      console.log(`[${jobType}] Job ${jobId} is active`);
    });
  }

  /**
   * Get job status and details
   * 
   * @param jobType - Type of job
   * @param jobId - Job identifier
   * @returns Job state and data
   */
  public async getJobStatus(jobType: JobType, jobId: string) {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for ${jobType} not initialized`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      state: await job.getState(),
    };
  }

  /**
   * Gracefully shutdown all queues and workers
   * Waits for active jobs to complete before closing connections
   */
  public async shutdown(): Promise<void> {
    if (this.queues.size === 0 && this.workers.size === 0 && this.queueEvents.size === 0) {
      this.isShuttingDown = false;
      return;
    }

    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down queue manager...');

    const shutdownPromises: Promise<void>[] = [];

    for (const worker of this.workers.values()) {
      shutdownPromises.push(worker.close());
    }

    for (const queue of this.queues.values()) {
      shutdownPromises.push(queue.close());
    }

    for (const events of this.queueEvents.values()) {
      shutdownPromises.push(events.close());
    }

    await Promise.all(shutdownPromises);

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
    this.isShuttingDown = false;

    console.log('Queue manager shutdown complete');
  }
}
