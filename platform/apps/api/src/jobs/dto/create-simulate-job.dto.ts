import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSimulateJobDto {
  @ApiPropertyOptional({ default: 'TEST-001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  missionId?: string;

  @ApiPropertyOptional({ default: 'UNKNOWN' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  aircraft?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shouldGeneratePdf?: boolean;
}
