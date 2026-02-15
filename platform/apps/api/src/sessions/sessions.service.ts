import { Injectable, NotFoundException } from '@nestjs/common';
import { AnomalySeverity, ArtifactKind, RiskClass } from '@prisma/client';
import * as path from 'path';
import { PrismaService } from '../common/prisma.service';

const normalizeRisk = (risk?: string): RiskClass | undefined => {
  if (!risk) return undefined;
  const value = risk.toUpperCase();
  if (value === 'CRITICAL') return RiskClass.CRITICAL;
  if (value === 'MAJOR') return RiskClass.MAJOR;
  if (value === 'MINOR') return RiskClass.MINOR;
  if (value === 'OBSERVATION') return RiskClass.OBSERVATION;
  return undefined;
};

const normalizeSeverity = (severity?: string): AnomalySeverity | undefined => {
  if (!severity) return undefined;
  const value = severity.toUpperCase();
  if (value === 'CRITICAL') return AnomalySeverity.CRITICAL;
  if (value === 'MAJOR') return AnomalySeverity.MAJOR;
  if (value === 'MINOR') return AnomalySeverity.MINOR;
  if (value === 'OBSERVATION') return AnomalySeverity.OBSERVATION;
  return undefined;
};

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(page = 1, limit = 20, risk?: string): Promise<Record<string, unknown>> {
    const riskFilter = normalizeRisk(risk);
    const where = riskFilter ? { riskClassification: riskFilter } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { anomalies: true } } },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.session.count({ where })
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((item: any) => ({
        id: item.id,
        jobId: item.jobId,
        sourceSessionId: item.sourceSessionId,
        missionId: item.missionId,
        aircraftType: item.aircraftType,
        startTime: item.startTime,
        endTime: item.endTime,
        stabilityIndex: item.stabilityIndex,
        sensorReliability: item.sensorReliability,
        missionCompliance: item.missionCompliance,
        riskClassification: item.riskClassification,
        anomalyCount: item._count.anomalies,
        createdAt: item.createdAt
      }))
    };
  }

  async getSession(sessionId: string): Promise<Record<string, unknown>> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        _count: { select: { anomalies: true } }
      }
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    return {
      id: session.id,
      jobId: session.jobId,
      sourceSessionId: session.sourceSessionId,
      missionId: session.missionId,
      aircraftType: session.aircraftType,
      startTime: session.startTime,
      endTime: session.endTime,
      stabilityIndex: session.stabilityIndex,
      sensorReliability: session.sensorReliability,
      missionCompliance: session.missionCompliance,
      riskClassification: session.riskClassification,
      anomalyCount: session._count.anomalies,
      createdAt: session.createdAt
    };
  }

  async getSessionAnomalies(
    sessionId: string,
    page = 1,
    limit = 50,
    severity?: string
  ): Promise<Record<string, unknown>> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true }
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const severityFilter = normalizeSeverity(severity);
    const where = severityFilter
      ? { sessionId, severity: severityFilter }
      : { sessionId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.anomaly.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.anomaly.count({ where })
    ]);

    return {
      page,
      limit,
      total,
      items
    };
  }

  async getReportPath(sessionId: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        job: {
          include: {
            artifacts: {
              where: { kind: ArtifactKind.HTML },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    const artifact = session.job.artifacts[0];
    if (!artifact) {
      throw new NotFoundException(`No HTML report found for session ${sessionId}`);
    }

    return path.resolve(session.job.outputDir, artifact.fileName);
  }
}
