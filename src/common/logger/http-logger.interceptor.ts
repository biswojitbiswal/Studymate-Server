// src/common/logger/http-logger.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Logger } from 'winston';

const SENSITIVE_QUERY_PARAMETERS = [
  'access_token',
  'authorization',
  'code',
  'password',
  'refresh_token',
  'secret',
  'token',
];

const sanitizeRoute = (route: string): string => {
  try {
    const parsedUrl = new URL(route, 'http://localhost');

    for (const key of parsedUrl.searchParams.keys()) {
      if (
        SENSITIVE_QUERY_PARAMETERS.some((sensitiveKey) =>
          key.toLowerCase().includes(sensitiveKey),
        )
      ) {
        parsedUrl.searchParams.set(key, '[REDACTED]');
      }
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return route.split('?')[0];
  }
};

const getRequestId = (requestIdHeader: unknown): string => {
  const requestId = Array.isArray(requestIdHeader)
    ? requestIdHeader[0]
    : requestIdHeader;

  return typeof requestId === 'string' &&
    /^[a-zA-Z0-9._:-]{1,100}$/.test(requestId)
    ? requestId
    : randomUUID();
};

const getErrorStatus = (error: unknown): number => {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { status?: unknown; statusCode?: unknown };
    const status = Number(candidate.status ?? candidate.statusCode);

    if (Number.isInteger(status) && status >= 400 && status <= 599) {
      return status;
    }
  }

  return 500;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Unknown error';
};

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const route = sanitizeRoute(request.originalUrl || request.url || '/');
    const requestId = getRequestId(request.headers?.['x-request-id']);
    const startTime = process.hrtime.bigint();

    response.setHeader('X-Request-ID', requestId);

    const metadata = (status: number) => ({
      context: 'HTTP',
      requestId,
      method,
      route,
      status,
      durationMs: Number(
        (Number(process.hrtime.bigint() - startTime) / 1_000_000).toFixed(2),
      ),
      userId: request.user?.id,
      role: request.user?.role,
      ip: request.ip,
    });

    return next.handle().pipe(
      tap(() => {
        const status = response.statusCode ?? 200;
        this.logger.info('request.completed', metadata(status));
      }),
      catchError((error: unknown) => {
        const status = getErrorStatus(error);
        const logMetadata = {
          ...metadata(status),
          error: getErrorMessage(error),
          ...(status >= 500 && error instanceof Error
            ? { stack: error.stack }
            : {}),
        };

        if (status >= 500) {
          this.logger.error('request.failed', logMetadata);
        } else {
          this.logger.warn('request.rejected', logMetadata);
        }

        return throwError(() => error);
      }),
    );
  }
}
