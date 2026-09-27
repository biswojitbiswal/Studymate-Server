import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles, SignupIntent } from '@prisma/client';
import {
  ACCOUNT_INTENTS_KEY,
  ALLOW_TUTOR_APPLICANT_KEY,
} from '../decorator/account-access.decorator';
import { AccountAccessGuard } from './account-access.guard';

describe('AccountAccessGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: AccountAccessGuard;

  const createContext = (user?: { role: Roles; signupIntent: SignupIntent }) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new AccountAccessGuard(reflector as unknown as Reflector);
  });

  it('allows public requests that have no authenticated user', () => {
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a normal student when no account restriction is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(
      guard.canActivate(
        createContext({
          role: Roles.STUDENT,
          signupIntent: SignupIntent.STUDENT,
        }),
      ),
    ).toBe(true);
  });

  it('rejects a user whose signup intent is not allowed by the endpoint', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ACCOUNT_INTENTS_KEY ? [SignupIntent.STUDENT] : undefined,
    );

    expect(() =>
      guard.canActivate(
        createContext({
          role: Roles.TUTOR,
          signupIntent: SignupIntent.TUTOR,
        }),
      ),
    ).toThrow(
      new ForbiddenException('This action is not available for your account type'),
    );
  });

  it('blocks an unapproved tutor applicant by default', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(() =>
      guard.canActivate(
        createContext({
          role: Roles.STUDENT,
          signupIntent: SignupIntent.TUTOR,
        }),
      ),
    ).toThrow('Complete your tutor application and wait for approval');
  });

  it('allows a tutor applicant on explicitly permitted endpoints', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === ALLOW_TUTOR_APPLICANT_KEY ? true : undefined,
    );

    expect(
      guard.canActivate(
        createContext({
          role: Roles.STUDENT,
          signupIntent: SignupIntent.TUTOR,
        }),
      ),
    ).toBe(true);
  });
});
