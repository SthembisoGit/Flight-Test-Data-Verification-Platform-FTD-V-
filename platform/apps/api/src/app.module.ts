import { Module } from '@nestjs/common';
import { ConfigService } from './common/config.service';
import { PrismaService } from './common/prisma.service';
import { QueueService } from './common/queue.service';
import { HealthController } from './health/health.controller';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { ArtifactsController } from './artifacts/artifacts.controller';
import { ArtifactsService } from './artifacts/artifacts.service';

@Module({
  controllers: [HealthController, JobsController, SessionsController, ArtifactsController],
  providers: [
    ConfigService,
    PrismaService,
    QueueService,
    JobsService,
    SessionsService,
    ArtifactsService
  ]
})
export class AppModule {}
