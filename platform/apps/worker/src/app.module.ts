import { Module } from '@nestjs/common';
import { ConfigService } from './common/config.service';
import { PrismaService } from './common/prisma.service';
import { AnalysisWorkerService } from './worker/analysis.worker';

@Module({
  providers: [ConfigService, PrismaService, AnalysisWorkerService]
})
export class AppModule {}
