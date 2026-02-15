import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List processed sessions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'risk', required: false })
  listSessions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('risk') risk?: string
  ): Promise<Record<string, unknown>> {
    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Math.min(Number.parseInt(limit, 10) || 20, 100);
    return this.sessionsService.listSessions(parsedPage, parsedLimit, risk);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session detail' })
  getSession(@Param('sessionId') sessionId: string): Promise<Record<string, unknown>> {
    return this.sessionsService.getSession(sessionId);
  }

  @Get(':sessionId/anomalies')
  @ApiOperation({ summary: 'List session anomalies' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'severity', required: false })
  getSessionAnomalies(
    @Param('sessionId') sessionId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('severity') severity?: string
  ): Promise<Record<string, unknown>> {
    const parsedPage = Number.parseInt(page, 10) || 1;
    const parsedLimit = Math.min(Number.parseInt(limit, 10) || 50, 500);
    return this.sessionsService.getSessionAnomalies(sessionId, parsedPage, parsedLimit, severity);
  }

  @Get(':sessionId/report')
  @ApiOperation({ summary: 'Get HTML report for session' })
  async getSessionReport(@Param('sessionId') sessionId: string, @Res() res: Response): Promise<void> {
    const reportPath = await this.sessionsService.getReportPath(sessionId);
    res.sendFile(reportPath);
  }
}
