import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const secret = 'unit-test-secret';
  let reflector: { getAllAndOverride: jest.Mock };
  let configService: { get: jest.Mock };
  let prisma: { user: { findUnique: jest.Mock } };
  let guard: AuthGuard;

  const createContext = (headers: Record<string, string> = {}) => {
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers,
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    configService = { get: jest.fn().mockReturnValue(secret) };
    prisma = { user: { findUnique: jest.fn() } };
    guard = new AuthGuard(
      reflector as unknown as Reflector,
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('allows public endpoints without a token or database lookup', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(configService.get).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects requests without an Authorization header', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization header missing'),
    );
  });

  it('rejects malformed bearer tokens', async () => {
    const { context } = createContext({ authorization: 'Token abc' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid authorization header format',
    );
  });

  it('loads an active user and attaches it to the request', async () => {
    const user = {
      id: 'user-1',
      email: 'student@example.com',
      role: 'STUDENT',
      signupIntent: 'STUDENT',
      isActive: true,
    };
    const token = jwt.sign({ id: user.id }, secret);
    prisma.user.findUnique.mockResolvedValue(user);
    const { context, request } = createContext({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        signupIntent: true,
        isActive: true,
      },
    });
    expect(request.user).toBe(user);
  });

  it('rejects a valid token when its user no longer exists', async () => {
    const token = jwt.sign({ sub: 'deleted-user' }, secret);
    prisma.user.findUnique.mockResolvedValue(null);
    const { context } = createContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toThrow('User not found');
  });

  it('rejects inactive users', async () => {
    const token = jwt.sign({ id: 'inactive-user' }, secret);
    prisma.user.findUnique.mockResolvedValue({
      id: 'inactive-user',
      isActive: false,
    });
    const { context } = createContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Your account is inactive',
    );
  });

  it('does not reveal token verification details to callers', async () => {
    const { context } = createContext({ authorization: 'Bearer invalid' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or expired token',
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
