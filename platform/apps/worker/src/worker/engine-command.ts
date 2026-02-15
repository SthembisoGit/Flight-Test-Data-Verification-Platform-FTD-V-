import { JobMode } from '@prisma/client';
import * as path from 'path';

export interface EngineCommandInput {
  mode: JobMode;
  inputFilePath: string | null;
  missionId: string;
  aircraft: string;
  shouldGeneratePdf: boolean;
  outputDir: string;
  enablePdf: boolean;
}

export const buildEngineArgs = (input: EngineCommandInput): string[] => {
  const args: string[] = [];
  const dbPath = path.resolve(input.outputDir, 'test.db');

  if (input.mode === JobMode.SIMULATE) {
    args.push('--simulate');
  } else {
    if (!input.inputFilePath) {
      throw new Error('inputFilePath is required for CSV_UPLOAD mode');
    }
    args.push('--input', input.inputFilePath);
  }

  args.push(
    '--mission',
    input.missionId,
    '--aircraft',
    input.aircraft,
    '--output-dir',
    input.outputDir,
    '--db-path',
    dbPath
  );

  if (input.shouldGeneratePdf && input.enablePdf) {
    args.push('--pdf');
  }

  return args;
};
