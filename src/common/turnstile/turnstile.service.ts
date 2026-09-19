import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileVerificationResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class TurnstileService {
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.getOrThrow<string>(
      'TURNSTILE_SECRET_KEY',
    );
  }

  async verify(token: string, remoteIp: string | undefined, action: string) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5_000);

    try {
      console.log(this.secretKey, token);
      
      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: this.secretKey,
            response: token,
            ...(remoteIp ? { remoteip: remoteIp } : {}),
          }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Human verification is temporarily unavailable. Please try again.',
        );
      }

      const result = (await response.json()) as TurnstileVerificationResponse;

      if (!result.success || result.action !== action) {
        throw new BadRequestException(
          'Human verification failed. Please complete the CAPTCHA again.',
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'Human verification is temporarily unavailable. Please try again.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
