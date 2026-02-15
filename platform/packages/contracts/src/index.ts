export type JobMode = 'SIMULATE' | 'CSV_UPLOAD';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ArtifactKind = 'DB' | 'CSV' | 'HTML' | 'PDF' | 'INPUT';
export type Severity = 'critical' | 'major' | 'minor' | 'observation';
export type RiskClass = 'Critical' | 'Major' | 'Minor' | 'Observation';

export interface ArtifactDto {
  id: string;
  kind: ArtifactKind;
  fileName: string;
  relativePath: string;
  sizeBytes: number;
  createdAt: string;
}

export interface JobDto {
  id: string;
  mode: JobMode;
  status: JobStatus;
  missionId: string;
  aircraft: string;
  inputFilename?: string | null;
  shouldGeneratePdf: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  log?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  artifacts?: ArtifactDto[];
  sessionId?: string | null;
}

export interface SessionDto {
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
  riskClassification: RiskClass;
  anomalyCount: number;
  createdAt: string;
}

export interface AnomalyDto {
  id: string;
  sessionId: string;
  timestamp: number;
  type: string;
  paramAffected?: string | null;
  severity: Severity;
  details?: string | null;
}

export interface PaginationResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface QueueJobPayload {
  jobId: string;
}
