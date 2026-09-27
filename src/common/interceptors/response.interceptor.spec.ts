import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const context = {} as ExecutionContext;

  it('wraps controller results in the standard API response envelope', async () => {
    const next = { handle: () => of({ id: 'class-1' }) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      error: 0,
      message: 'Request successful',
      data: { id: 'class-1' },
    });
  });

  it('uses null data for controllers that return no content', async () => {
    const next = { handle: () => of(undefined) } as CallHandler;

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).resolves.toEqual({
      error: 0,
      message: 'Request successful',
      data: null,
    });
  });
});
