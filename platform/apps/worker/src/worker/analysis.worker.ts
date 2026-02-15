import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  AnomalySeverity,
  ArtifactKind,
  JobMode,
  JobStatus,
  RiskClass
} from '@prisma/client';
import { Job as BullJob, Worker } from 'bullmq';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { ConfigService } from '../common/config.service';
import { PrismaService } from '../common/prisma.service';
import { buildEngineArgs } from './engine-command';

interface QueuePayload {
  jobId: string;
}

interface SQLiteSessionRow {
  id: number;
  mission_id: string;
  start_time: number;
  end_time: number | null;
  aircraft_type: string | null;
}

interface SQLiteMetricRow {
  stability_index: number | null;
  sensor_reliability: number | null;
  mission_compliance: number | null;
  risk_classification: string | null;
}

@Injectable()
export class AnalysisWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalysisWorkerService.name);
  private worker?: Worker<QueuePayload>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.config.values.artifactsRoot, { recursive: true });

    this.worker = new Worker<QueuePayload>(
      this.config.values.queueName,
      async (job) => this.processQueueJob(job),
      {
        connection: {
          url: this.config.values.redisUrl
        },
        concurrency: this.config.values.queueConcurrency
      }
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Completed queue job ${job.id}`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Failed queue job ${job?.id ?? 'unknown'}: ${err.message}`);
    });

    this.logger.log(
      `Worker listening queue=${this.config.values.queueName} concurrency=${this.config.values.queueConcurrency}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processQueueJob(queueJob: BullJob<QueuePayload>): Promise<void> {
    const jobId = queueJob.data.jobId;
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      this.logger.warn(`Job ${jobId} not found in DB`);
      return;
    }

    await this.prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        finishedAt: null,
        error: null
      }
    });

    const started = Date.now();
    try {
      await fs.mkdir(job.outputDir, { recursive: true });
      const execution = await this.runEngine(job);
      await this.importJobResults(job.id, job.outputDir, job.missionId, job.aircraft);
      await this.syncArtifacts(job.id, job.outputDir);

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          finishedAt: new Date(),
          exitCode: execution.exitCode,
          log: this.mergeLogs(execution.stdout, execution.stderr, started),
          error: null
        }
      });
    } catch (error) {
      const err = error as Error;
      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          finishedAt: new Date(),
          error: err.message
        }
      });
      throw error;
    }
  }

  private async runEngine(job: {
    id: string;
    mode: JobMode;
    inputFilePath: string | null;
    missionId: string;
    aircraft: string;
    shouldGeneratePdf: boolean;
    outputDir: string;
  }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    if (job.mode === JobMode.CSV_UPLOAD) {
      if (!job.inputFilePath) {
        throw new Error(`Job ${job.id} missing input file path`);
      }
      if (!fsSync.existsSync(job.inputFilePath)) {
        throw new Error(`Input file does not exist: ${job.inputFilePath}`);
      }
    }

    const args = buildEngineArgs({
      mode: job.mode,
      inputFilePath: job.inputFilePath,
      missionId: job.missionId,
      aircraft: job.aircraft,
      shouldGeneratePdf: job.shouldGeneratePdf,
      outputDir: job.outputDir,
      enablePdf: this.config.values.enablePdf
    });

    const executable = this.config.values.engineBinaryPath;
    if (!fsSync.existsSync(executable)) {
      throw new Error(`ENGINE_BINARY_PATH not found: ${executable}`);
    }

    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        cwd: this.config.values.engineWorkdir
      });

      let stdout = '';
      let stderr = '';
      let timeoutTriggered = false;

      const timeout = setTimeout(() => {
        timeoutTriggered = true;
        child.kill('SIGTERM');
      }, this.config.values.engineTimeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      child.on('close', (code) => {
        clearTimeout(timeout);
        if (timeoutTriggered) {
          reject(new Error(`Engine timed out after ${this.config.values.engineTimeoutMs}ms`));
          return;
        }
        const exitCode = code ?? -1;
        if (exitCode !== 0) {
          reject(
            new Error(`Engine exited with code ${exitCode}\nstdout:\n${stdout}\nstderr:\n${stderr}`)
          );
          return;
        }
        resolve({ exitCode, stdout, stderr });
      });
    });
  }

  private mergeLogs(stdout: string, stderr: string, started: number): string {
    const durationMs = Date.now() - started;
    return [`duration_ms=${durationMs}`, '--- stdout ---', stdout, '--- stderr ---', stderr]
      .join('\n')
      .trim();
  }

  private mapRiskClass(value: string | null | undefined): RiskClass {
    switch ((value ?? '').toLowerCase()) {
      case 'critical':
        return RiskClass.CRITICAL;
      case 'major':
        return RiskClass.MAJOR;
      case 'minor':
        return RiskClass.MINOR;
      default:
        return RiskClass.OBSERVATION;
    }
  }

  private mapSeverity(value: string | null | undefined): AnomalySeverity {
    switch ((value ?? '').toLowerCase()) {
      case 'critical':
        return AnomalySeverity.CRITICAL;
      case 'major':
        return AnomalySeverity.MAJOR;
      case 'minor':
        return AnomalySeverity.MINOR;
      default:
        return AnomalySeverity.OBSERVATION;
    }
  }

  private async importJobResults(
    jobId: string,
    outputDir: string,
    fallbackMissionId: string,
    fallbackAircraft: string
  ): Promise<void> {
    const dbPath = path.resolve(outputDir, 'test.db');
    if (!fsSync.existsSync(dbPath)) {
      throw new Error(`Job database missing: ${dbPath}`);
    }

    const sqliteDb = await open({ filename: dbPath, driver: sqlite3.Database });
    try {
      const session = await sqliteDb.get<SQLiteSessionRow>(
        'SELECT id, mission_id, start_time, end_time, aircraft_type FROM flight_sessions ORDER BY id DESC LIMIT 1'
      );
      if (!session) throw new Error('No flight session found in SQLite output');

      const metrics =
        (await sqliteDb.get<SQLiteMetricRow>(
          'SELECT stability_index, sensor_reliability, mission_compliance, risk_classification FROM session_metrics WHERE session_id = ? LIMIT 1',
          session.id
        )) ?? null;

      const anomalies = await sqliteDb.all<
        {
          timestamp: number;
          type: string;
          param_affected: string | null;
          severity: string | null;
          details: string | null;
        }[]
      >(
        'SELECT timestamp, type, param_affected, severity, details FROM anomalies WHERE session_id = ? ORDER BY timestamp ASC',
        session.id
      );

      const existing = await this.prisma.session.findUnique({
        where: { jobId },
        select: { id: true }
      });
      if (existing) {
        await this.prisma.anomaly.deleteMany({ where: { sessionId: existing.id } });
        await this.prisma.session.delete({ where: { id: existing.id } });
      }

      const created = await this.prisma.session.create({
        data: {
          jobId,
          sourceSessionId: session.id,
          missionId: session.mission_id || fallbackMissionId,
          aircraftType: session.aircraft_type || fallbackAircraft,
          startTime: session.start_time,
          endTime: session.end_time ?? session.start_time,
          stabilityIndex: metrics?.stability_index ?? 0,
          sensorReliability: metrics?.sensor_reliability ?? 0,
          missionCompliance: metrics?.mission_compliance ?? 0,
          riskClassification: this.mapRiskClass(metrics?.risk_classification)
        }
      });

      if (anomalies.length > 0) {
        await this.prisma.anomaly.createMany({
          data: anomalies.map((item) => ({
            sessionId: created.id,
            timestamp: item.timestamp,
            type: item.type,
            paramAffected: item.param_affected,
            severity: this.mapSeverity(item.severity),
            details: item.details
          }))
        });
      }
    } finally {
      await sqliteDb.close();
    }
  }

  private artifactKindForFile(fileName: string): ArtifactKind | undefined {
    switch (fileName) {
      case 'test.db':
        return ArtifactKind.DB;
      case 'report.html':
        return ArtifactKind.HTML;
      case 'report.pdf':
        return ArtifactKind.PDF;
      case 'sim_flight.csv':
        return ArtifactKind.CSV;
      case 'input.csv':
        return ArtifactKind.INPUT;
      default:
        return undefined;
    }
  }

  private async syncArtifacts(jobId: string, outputDir: string): Promise<void> {
    const files = await fs.readdir(outputDir);
    for (const fileName of files) {
      const kind = this.artifactKindForFile(fileName);
      if (!kind) continue;

      const absolutePath = path.resolve(outputDir, fileName);
      const stat = await fs.stat(absolutePath);
      const relativePath = path.relative(this.config.values.artifactsRoot, absolutePath);

      await this.prisma.artifact.upsert({
        where: {
          jobId_kind_fileName: {
            jobId,
            kind,
            fileName
          }
        },
        update: {
          relativePath,
          sizeBytes: stat.size
        },
        create: {
          jobId,
          kind,
          fileName,
          relativePath,
          sizeBytes: stat.size
        }
      });
    }
  }
}
