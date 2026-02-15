import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUploadJobDto {
  @ApiPropertyOptional({ default: 'REAL-001' })
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
  @Transform(({ value }) => ['1', 'true', true, 'on', 'yes'].includes(value))
  @IsBoolean()
  shouldGeneratePdf?: boolean;
}
