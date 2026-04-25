/**
 * Queue Manager
 * 
 * Central manager for creating and managing BullMQ queues and workers.
 * Provides a unified interface for job enqueueing and processing.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { queueConfig } from './config';
import { JobType, JobPayload, JobResult } from './types';
import { jobProcessors } from './processors';

/**
 * Queue health information - safe for admin exposure
 */
export interface QueueHealthInfo {
  jobType: JobType;
  isInitialized: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface FailedJobInfo {
  jobId: string;
  jobType: JobType;
  failedAt: number;
  error: string;
}
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
   * Add a job to the queue
   * 
   * @param jobType - Type of job to enqueue
   * @param payload - Job-specific data payload
   * @param options - Optional job configuration (priority, delay, etc.)
   * @returns Job ID
   * @throws Error if queue not initialized or job addition fails
   */
  public async addJob(
    jobType: JobType,
    payload: JobPayload,
    options?: { priority?: number; delay?: number }
  ): Promise<string> {
    const queue = this.queues.get(jobType);
    if (!queue) {
      throw new Error(`Queue for ${jobType} not initialized`);
    }

    const job = await queue.add(jobType, payload, options);
    return job.id!;
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

  /**
   * Get health information for all queues
   * Returns sanitized queue metrics without sensitive job data
   *
   * @returns Array of queue health information
   */
  public async getHealth(): Promise<QueueHealthInfo[]> {
    const healthInfos: QueueHealthInfo[] = [];

    for (const jobType of Object.values(JobType)) {
      const queue = this.queues.get(jobType);
      const worker = this.workers.get(jobType);

      if (queue && worker) {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        healthInfos.push({
          jobType,
          isInitialized: true,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused: await worker.isRunning() === false,
        });
      } else {
        healthInfos.push({
          jobType,
          isInitialized: false,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: false,
        });
      }
    }

    return healthInfos;
  }

  /**
   * Get recent failed jobs
   * Returns sanitized information about recently failed jobs without exposing payloads
   *
   * @param limit - Maximum number of failed jobs to return (default 10)
   * @returns Array of failed job information
   */
  public async getRecentFailures(limit = 10): Promise<FailedJobInfo[]> {
    const failures: FailedJobInfo[] = [];

    for (const [jobType, queue] of this.queues) {
      const failedJobs = await queue.getFailed(0, limit);
      for (const job of failedJobs) {
        failures.push({
          jobId: job.id?.toString() ?? 'unknown',
          jobType,
          failedAt: job.finishedOn ?? Date.now(),
          error: job.failedReason ?? 'Unknown error',
        });
      }
    }

    return failures
      .sort((a, b) => b.failedAt - a.failedAt)
      .slice(0, limit);
  }
}
