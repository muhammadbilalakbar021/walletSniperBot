import { Global, Module } from '@nestjs/common';
import { ConsoleService } from '../utils/console/console.service';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [ConfigService, ConsoleService],
  exports: [ConfigService],
})
export class ConfigModule {}
