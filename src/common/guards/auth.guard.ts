// src/auth/guards/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,  // <--- inject Prisma
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 1) Public route → don’t check auth
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authorization header missing');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    try {
      // 2) Verify token
      const payload = jwt.verify(token, secret) as any;
      const userId = payload.id ?? payload.sub;

      if (!userId) {
        throw new UnauthorizedException('Invalid token payload: user id missing');
      }

      // 3) Check user exists in DB
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          // isActive: true,  // if you add this field later
        },
      });

      if (!user) {
        // user deleted or never existed
        throw new UnauthorizedException('User not found');
      }

      // Optional: if you add isActive / status later
      // if (!user.isActive) {
      //   throw new UnauthorizedException('User is inactive');
      // }

      // 4) Attach user to request
      request.user = user;

      return true;
    } catch (e) {
      // Any error → treat as unauthorized
      throw new UnauthorizedException(
        e instanceof UnauthorizedException ? e.message : 'Invalid or expired token',
      );
    }
  }
}
