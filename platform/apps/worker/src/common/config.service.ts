import { Injectable } from '@nestjs/common';
import { WorkerConfig, loadConfig } from './config';

@Injectable()
export class ConfigService {
  private readonly config: WorkerConfig = loadConfig();

  get values(): WorkerConfig {
    return this.config;
  }
}
