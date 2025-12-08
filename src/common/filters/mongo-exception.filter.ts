// src/common/filters/mongo-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch()
export class MongoExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const err = exception as any;

    const isMongoError =
      err?.name === 'MongoServerError' ||
      err?.name === 'MongoError' ||
      typeof err?.code !== 'undefined';

    if (!isMongoError) return; // Not a Mongo error → let next filter handle

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const path = req.originalUrl;
    const method = req.method;

    this.logger.error('MongoServerError', {
      name: err.name,
      code: err.code,
      message: err.message,
      stack: err.stack,
      path,
      method,
    });

    // Duplicate key error
    if (err.code === 11000) {
      const key = Object.keys(err.keyPattern || {}).join(', ') || 'field';

      return res.status(HttpStatus.CONFLICT).json({
        error: 1,
        message: `${key} already exists`,
      });
    }

    // Generic Mongo DB error
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 1,
      message: 'A database error occurred',
    });
  }
}
