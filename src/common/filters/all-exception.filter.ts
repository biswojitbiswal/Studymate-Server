import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // ✅ 1. PRISMA ERRORS
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        let field = 'field';

        const target = exception.meta?.target;
        console.log(target);

        if (Array.isArray(target) && target.length > 0) {
          // Case: ['slug']
          field = target[0];
        } else if (typeof target === 'string') {
          // Case: Board_slug_key → extract "slug"
          const parts = target.split('_');
          field = parts[parts.length - 2] || field;
        }

        return res.status(HttpStatus.CONFLICT).json({
          error: 1,
          message: `${field} already exists`,
        });
      }

      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 1,
        message: 'Database error',
      });
    }

    // ✅ 2. HTTP EXCEPTIONS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as any).message ?? 'An error occurred';

      return res.status(status).json({
        error: 1,
        message,
      });
    }

    // ✅ 3. UNKNOWN ERRORS (fallback)
    console.error('Unhandled error:', exception);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 1,
      message: 'Something went wrong. Please try again later.',
    });
  }
}
