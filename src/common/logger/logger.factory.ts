// src/common/logger/logger.factory.ts
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export const createWinstonTransports = () => {
  const transportConsole = new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info', // info and above to console
    handleExceptions: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      nestWinstonModuleUtilities.format.nestLike('MyApp', { prettyPrint: true }),
    ),
  });

  const transportFile = new DailyRotateFile({
    level: 'error', // <<-- only errors go to files
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    handleExceptions: true,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  });

  return { transportConsole, transportFile };
};
