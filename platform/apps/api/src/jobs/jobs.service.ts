import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ArtifactKind, JobMode, JobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConfigService } from '../common/config.service';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../common/queue.service';
import { CreateSimulateJobDto } from './dto/create-simulate-job.dto';
import { CreateUploadJobDto } from './dto/create-upload-job.dto';

const DEFAULT_MISSION = 'TEST-001';
const DEFAULT_AIRCRAFT = 'UNKNOWN';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly config: ConfigService
  ) {}

  async createSimulateJob(dto: CreateSimulateJobDto): Promise<Record<string, unknown>> {
    const id = randomUUID();
    const outputDir = this.resolveOutputDir(id);
    await fs.mkdir(outputDir, { recursive: true });

    const job = await this.prisma.job.create({
      data: {
        id,
        mode: JobMode.SIMULATE,
        status: JobStatus.QUEUED,
        missionId: dto.missionId ?? DEFAULT_MISSION,
        aircraft: dto.aircraft ?? DEFAULT_AIRCRAFT,
        shouldGeneratePdf: dto.shouldGeneratePdf ?? false,
        outputDir
      }
    });

    await this.queue.enqueueAnalysisJob(job.id);
    return this.mapJob(job);
  }

  async createUploadJob(
    dto: CreateUploadJobDto,
    file: Express.Multer.File | undefined
  ): Promise<Record<string, unknown>> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported');
    }
    if (file.size <= 0) {
      throw new BadRequestException('Uploaded CSV is empty');
    }

    const id = randomUUID();
    const outputDir = this.resolveOutputDir(id);
    await fs.mkdir(outputDir, { recursive: true });

    const inputName = 'input.csv';
    const inputPath = path.join(outputDir, inputName);
    await fs.writeFile(inputPath, file.buffer);

    const job = await this.prisma.job.create({
      data: {
        id,
        mode: JobMode.CSV_UPLOAD,
        status: JobStatus.QUEUED,
        missionId: dto.missionId ?? DEFAULT_MISSION,
        aircraft: dto.aircraft ?? DEFAULT_AIRCRAFT,
        shouldGeneratePdf: dto.shouldGeneratePdf ?? false,
        inputFilename: file.originalname,
        inputFilePath: inputPath,
        outputDir,
        artifacts: {
          create: {
            kind: ArtifactKind.INPUT,
            fileName: inputName,
            relativePath: this.toRelativeArtifactPath(inputPath),
            sizeBytes: file.size
          }
        }
      },
      include: {
        artifacts: true
      }
    });

    await this.queue.enqueueAnalysisJob(job.id);
    return this.mapJob(job);
  }

  async listJobs(page = 1, limit = 20, status?: string): Promise<Record<string, unknown>> {
    const where =
      status && Object.values(JobStatus).includes(status as JobStatus)
        ? { status: status as JobStatus }
        : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          artifacts: true,
          session: true
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.job.count({ where })
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((item: any) => this.mapJob(item))
    };
  }

  async getJob(jobId: string): Promise<Record<string, unknown>> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        artifacts: true,
        session: true
      }
    });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return this.mapJob(job);
  }

  private resolveOutputDir(jobId: string): string {
    return path.resolve(this.config.values.artifactsRoot, jobId);
  }

  private toRelativeArtifactPath(absolutePath: string): string {
    return path.relative(this.config.values.artifactsRoot, absolutePath);
  }

  private mapJob(job: any): Record<string, unknown> {
    const sessionId = job.session?.id ?? null;
    const artifacts = (job.artifacts ?? []).map((artifact: any) => ({
      id: artifact.id,
      kind: artifact.kind,
      fileName: artifact.fileName,
      relativePath: artifact.relativePath,
      sizeBytes: artifact.sizeBytes,
      createdAt: artifact.createdAt
    }));

    return {
      id: job.id,
      mode: job.mode,
      status: job.status,
      missionId: job.missionId,
      aircraft: job.aircraft,
      inputFilename: job.inputFilename,
      shouldGeneratePdf: job.shouldGeneratePdf,
      outputDir: job.outputDir,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      exitCode: job.exitCode,
      log: job.log,
      error: job.error,
      sessionId,
      artifacts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  validateFileSize(sizeBytes: number): void {
    const maxBytes = this.config.values.maxUploadMb * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      throw new BadRequestException(
        `Upload exceeds MAX_UPLOAD_MB (${this.config.values.maxUploadMb}MB)`
      );
    }
  }
}
