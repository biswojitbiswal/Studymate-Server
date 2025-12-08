// src/common/logger/http-logger.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';
import type { Logger } from 'winston';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const method = req.method;
    const url = req.originalUrl || req.url;
    const startTime = Date.now();

    // Log incoming request (console will show this)
    this.logger.info(`Incoming Request: ${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        // statusCode available on response
        const status = res?.statusCode ?? 200;
        // Log success (only goes to console because file transport level is 'error')
        this.logger.info(`Response: ${method} ${url} ${status} - ${duration}ms`);
      }),
      catchError((err) => {
        const duration = Date.now() - startTime;
        // Log error — this will be written to file by DailyRotateFile (level 'error')
        this.logger.error(
          `Error: ${method} ${url} - ${err?.message || err} - ${duration}ms`,
          { stack: err?.stack, status: res?.statusCode },
        );
        // rethrow so Nest handles the exception as usual
        throw err;
      }),
    );
  }
}
