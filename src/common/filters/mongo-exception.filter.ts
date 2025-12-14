import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch() // still OK because we respond ALWAYS
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const err = exception as any;

    const isMongoError =
      err?.name === 'MongoServerError' ||
      err?.name === 'MongoError';

    if (!isMongoError) {
      // ✅ MUST rethrow so another filter handles it
      throw exception;
    }

    const res = host.switchToHttp().getResponse<Response>();

    if (err.code === 11000) {
      const field =
        err?.keyPattern
          ? Object.keys(err.keyPattern).join(', ')
          : 'field';

      return res.status(HttpStatus.CONFLICT).json({
        error: 1,
        message: `${field} already exists`,
      });
    }

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 1,
      message: 'A database error occurred',
    });
  }
}
