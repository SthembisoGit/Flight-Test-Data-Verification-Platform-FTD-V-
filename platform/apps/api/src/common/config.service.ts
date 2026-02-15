import { Injectable } from '@nestjs/common';
import { AppConfig, loadConfig } from './config';

@Injectable()
export class ConfigService {
  private readonly config: AppConfig = loadConfig();

  get values(): AppConfig {
    return this.config;
  }
}
