import { JobMode } from '@prisma/client';
import { buildEngineArgs } from './engine-command';

describe('buildEngineArgs', () => {
  it('builds simulate arguments', () => {
    const args = buildEngineArgs({
      mode: JobMode.SIMULATE,
      inputFilePath: null,
      missionId: 'TEST-001',
      aircraft: 'F16',
      shouldGeneratePdf: false,
      outputDir: '/tmp/job-1',
      enablePdf: false
    });

    expect(args).toEqual(
      expect.arrayContaining([
        '--simulate',
        '--mission',
        'TEST-001',
        '--aircraft',
        'F16',
        '--output-dir',
        '/tmp/job-1',
        '--db-path',
        expect.stringContaining('test.db')
      ])
    );
  });

  it('requires input path for upload mode', () => {
    expect(() =>
      buildEngineArgs({
        mode: JobMode.CSV_UPLOAD,
        inputFilePath: null,
        missionId: 'REAL-01',
        aircraft: 'Gripen',
        shouldGeneratePdf: false,
        outputDir: '/tmp/job-2',
        enablePdf: false
      })
    ).toThrow('inputFilePath is required');
  });

  it('adds pdf flag only when enabled in both switches', () => {
    const args = buildEngineArgs({
      mode: JobMode.CSV_UPLOAD,
      inputFilePath: '/tmp/in.csv',
      missionId: 'REAL-01',
      aircraft: 'Gripen',
      shouldGeneratePdf: true,
      outputDir: '/tmp/job-3',
      enablePdf: true
    });
    expect(args).toContain('--pdf');
  });
});
