import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ArtifactsService } from './artifacts.service';

@ApiTags('artifacts')
@Controller('artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get(':jobId/:file')
  @ApiOperation({ summary: 'Download allowlisted artifact for a job' })
  async getArtifact(
    @Param('jobId') jobId: string,
    @Param('file') file: string,
    @Res() res: Response
  ): Promise<void> {
    const absolutePath = await this.artifactsService.getArtifactAbsolutePath(jobId, file);
    res.sendFile(absolutePath);
  }
}
