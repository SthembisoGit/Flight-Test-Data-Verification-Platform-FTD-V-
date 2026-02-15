import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { ConfigService } from './config.service';

export interface AnalysisQueuePayload {
  jobId: string;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queue: Queue<AnalysisQueuePayload>;
  private readonly defaultJobOptions: JobsOptions;

  constructor(private readonly config: ConfigService) {
    this.defaultJobOptions = {
      attempts: this.config.values.queueRetryAttempts,
      backoff: {
        type: 'exponential',
        delay: this.config.values.queueBackoffMs
      },
      removeOnComplete: 200,
      removeOnFail: false
    };

    this.queue = new Queue<AnalysisQueuePayload>(this.config.values.queueName, {
      connection: {
        url: this.config.values.redisUrl
      },
      defaultJobOptions: this.defaultJobOptions
    });
  }

  async enqueueAnalysisJob(jobId: string): Promise<string> {
    const queueJob = await this.queue.add('analysis', { jobId });
    return queueJob.id ?? '';
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
