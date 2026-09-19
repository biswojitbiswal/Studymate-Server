// src/common/logger/logger.module.ts
import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createWinstonTransports } from './logger.factory';

const transports = Object.values(createWinstonTransports());

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports,
      exitOnError: false,
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
