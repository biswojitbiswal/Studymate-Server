// src/common/filters/prisma-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import type { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientUnknownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const path = req.originalUrl;
    const method = req.method;

    this.logger.error('Prisma error', {
      message: exception.message,
      code: (exception as any).code,
      meta: (exception as any).meta,
      stack: exception.stack,
      path,
      method,
    });

    const code = (exception as any).code;

    switch (code) {
      case 'P2002': { // Unique constraint failed
        const target = exception.message ?? 'field';
        const message = Array.isArray(target)
          ? `${target.join(', ')} already exists`
          : `${target} already exists`;
        return res.status(HttpStatus.CONFLICT).json({
          error: 1,
          message,
        });
      }

      case 'P2025': // Record not found
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 1,
          message: 'Requested resource not found',
        });

      case 'P2003': // Foreign key constraint
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 1,
          message: 'Related resource does not exist',
        });

      default:
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 1,
          message: 'A database error occurred',
        });
    }
  }
}
