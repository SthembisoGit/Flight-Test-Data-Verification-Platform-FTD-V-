const withNoTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const CLIENT_API_BASE = withNoTrailingSlash(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'
);

export const SERVER_API_BASE = withNoTrailingSlash(
  process.env.API_BASE_URL_SERVER ?? CLIENT_API_BASE
);

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Artifact {
  id: string;
  kind: 'DB' | 'CSV' | 'HTML' | 'PDF' | 'INPUT';
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Job {
  id: string;
  mode: 'SIMULATE' | 'CSV_UPLOAD';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  missionId: string;
  aircraft: string;
  inputFilename?: string | null;
  shouldGeneratePdf: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  log?: string | null;
  error?: string | null;
  sessionId?: string | null;
  artifacts?: Artifact[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  jobId: string;
  sourceSessionId: number;
  missionId: string;
  aircraftType: string;
  startTime: number;
  endTime: number;
  stabilityIndex: number;
  sensorReliability: number;
  missionCompliance: number;
  riskClassification: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';
  anomalyCount: number;
  createdAt: string;
}

export interface Anomaly {
  id: string;
  sessionId: string;
  timestamp: number;
  type: string;
  paramAffected?: string | null;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';
  details?: string | null;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const base = typeof window === 'undefined' ? SERVER_API_BASE : CLIENT_API_BASE;
    const response = await fetch(`${base}${path}`, {
      ...init,
      cache: 'no-store'
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
