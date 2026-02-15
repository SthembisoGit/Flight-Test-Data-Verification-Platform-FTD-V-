import * as path from 'path';
import 'dotenv/config';

export interface AppConfig {
  nodeEnv: string;
  apiPort: number;
  databaseUrl: string;
  redisUrl: string;
  queueName: string;
  queueRetryAttempts: number;
  queueBackoffMs: number;
  artifactsRoot: string;
  maxUploadMb: number;
  corsOrigin: string;
  swaggerEnabled: boolean;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const defaultArtifactsRoot = (): string => {
  const cwd = process.cwd();
  if (cwd.includes(`${path.sep}apps${path.sep}api`) || cwd.includes(`${path.sep}apps${path.sep}worker`)) {
    return path.resolve(cwd, '..', '..', 'data', 'artifacts');
  }
  return path.resolve(cwd, 'data', 'artifacts');
};

export const loadConfig = (): AppConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    apiPort: parseNumber(process.env.API_PORT, 4000),
    databaseUrl,
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    queueName: process.env.QUEUE_NAME ?? 'analysis-jobs',
    queueRetryAttempts: parseNumber(process.env.QUEUE_RETRY_ATTEMPTS, 2),
    queueBackoffMs: parseNumber(process.env.QUEUE_BACKOFF_MS, 2000),
    artifactsRoot: process.env.ARTIFACTS_ROOT ?? defaultArtifactsRoot(),
    maxUploadMb: parseNumber(process.env.MAX_UPLOAD_MB, 50),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    swaggerEnabled: parseBool(process.env.SWAGGER_ENABLED, true)
  };
};
