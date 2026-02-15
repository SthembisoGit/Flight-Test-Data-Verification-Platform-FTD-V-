import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWLIST = new Set(['report.html', 'report.pdf', 'sim_flight.csv', 'test.db', 'input.csv']);

@Injectable()
export class ArtifactsService {
  constructor(private readonly prisma: PrismaService) {}

  async getArtifactAbsolutePath(jobId: string, fileName: string): Promise<string> {
    if (!ALLOWLIST.has(fileName)) {
      throw new BadRequestException(`Artifact ${fileName} is not in allowlist`);
    }

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, outputDir: true }
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const root = path.resolve(job.outputDir);
    const candidate = path.resolve(root, fileName);
    if (!(candidate === root || candidate.startsWith(`${root}${path.sep}`))) {
      throw new BadRequestException('Invalid artifact path');
    }
    if (!fs.existsSync(candidate)) {
      throw new NotFoundException(`Artifact ${fileName} does not exist`);
    }
    return candidate;
  }
}
