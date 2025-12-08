// src/common/filters/all-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const path = req.originalUrl || req.url;
    const method = req.method;

    // --- Case 1: HttpException (NotFoundException, BadRequestException, etc) ---
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resBody = exception.getResponse();
      const message = typeof resBody === 'string'
        ? resBody
        : (resBody as any).message || 'An error occurred';

      this.logger.warn('HTTP exception thrown', {
        message,
        status,
        path,
        method,
      });

      return res.status(status).json({
        error: 1,
        message,
      });
    }

    // --- Case 2: Unknown exception (programmer error, runtime crash) ---
    const message = (exception as any)?.message || 'Internal server error';

    this.logger.error('Unhandled exception', {
      message,
      stack: (exception as any)?.stack,
      path,
      method,
    });

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 1,
      message: 'Something went wrong. Please try again later.',
    });
  }
}
