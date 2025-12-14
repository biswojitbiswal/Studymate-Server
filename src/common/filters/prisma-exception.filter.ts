import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const target = exception.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : 'field';

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
}
