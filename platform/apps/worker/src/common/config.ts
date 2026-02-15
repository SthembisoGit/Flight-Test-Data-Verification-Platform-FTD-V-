import * as path from 'path';
import 'dotenv/config';

export interface WorkerConfig {
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  queueName: string;
  queueConcurrency: number;
  engineBinaryPath: string;
  engineWorkdir: string;
  engineTimeoutMs: number;
  artifactsRoot: string;
  enablePdf: boolean;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const isDockerPlatformCwd = (cwd: string): boolean => {
  return cwd === '/app/platform' || cwd.startsWith('/app/platform/');
};

const defaultEngineWorkdir = (): string => {
  const cwd = process.cwd();
  if (isDockerPlatformCwd(cwd)) {
    return '/app/engine';
  }
  if (cwd.includes(`${path.sep}apps${path.sep}worker`)) {
    return path.resolve(cwd, '..', '..', '..');
  }
  if (cwd.endsWith(`${path.sep}platform`)) {
    return path.resolve(cwd, '..');
  }
  return cwd;
};

const defaultArtifactsRoot = (): string => {
  const cwd = process.cwd();
  if (cwd.includes(`${path.sep}apps${path.sep}worker`)) {
    return path.resolve(cwd, '..', '..', 'data', 'artifacts');
  }
  return path.resolve(cwd, 'data', 'artifacts');
};

const defaultEngineBinaryPath = (): string => {
  const cwd = process.cwd();
  if (isDockerPlatformCwd(cwd)) {
    return '/usr/local/bin/astvdp';
  }
  const workdir = defaultEngineWorkdir();
  if (process.platform === 'win32') {
    return path.resolve(workdir, 'build', 'windows-msvc-local', 'Release', 'astvdp.exe');
  }
  return path.resolve(workdir, 'build', 'astvdp');
};

export const loadConfig = (): WorkerConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl,
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    queueName: process.env.QUEUE_NAME ?? 'analysis-jobs',
    queueConcurrency: parseNumber(process.env.QUEUE_CONCURRENCY, 2),
    engineBinaryPath: process.env.ENGINE_BINARY_PATH ?? defaultEngineBinaryPath(),
    engineWorkdir: process.env.ENGINE_WORKDIR ?? defaultEngineWorkdir(),
    engineTimeoutMs: parseNumber(process.env.ENGINE_TIMEOUT_MS, 900000),
    artifactsRoot: process.env.ARTIFACTS_ROOT ?? defaultArtifactsRoot(),
    enablePdf: parseBool(process.env.ENABLE_PDF, false)
  };
};
