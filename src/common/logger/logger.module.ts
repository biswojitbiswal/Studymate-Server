// src/common/logger/logger.module.ts
import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createWinstonTransports } from './logger.factory';

const { transportConsole, transportFile } = createWinstonTransports();

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [transportConsole, transportFile],
      exitOnError: false,
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
