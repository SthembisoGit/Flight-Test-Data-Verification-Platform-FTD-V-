import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateSimulateJobDto } from './dto/create-simulate-job.dto';
import { CreateUploadJobDto } from './dto/create-upload-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Create simulation processing job' })
  createSimulate(@Body() dto: CreateSimulateJobDto): Promise<Record<string, unknown>> {
    return this.jobsService.createSimulateJob(dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Create CSV upload processing job' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        missionId: { type: 'string' },
        aircraft: { type: 'string' },
        shouldGeneratePdf: { type: 'boolean' }
      },
      required: ['file']
    }
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage()
    })
  )
  async createUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateUploadJobDto
  ): Promise<Record<string, unknown>> {
    if (file) this.jobsService.validateFileSize(file.size);
    return this.jobsService.createUploadJob(dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  listJobs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string
  ): Promise<Record<string, unknown>> {
    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Math.min(Number.parseInt(limit, 10) || 20, 100);
    return this.jobsService.listJobs(parsedPage, parsedLimit, status);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get job details' })
  getJob(@Param('jobId') jobId: string): Promise<Record<string, unknown>> {
    return this.jobsService.getJob(jobId);
  }
}
