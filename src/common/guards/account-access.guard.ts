import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles, SignupIntent } from '@prisma/client';
import {
  ACCOUNT_INTENTS_KEY,
  ALLOW_TUTOR_APPLICANT_KEY,
} from '../decorator/account-access.decorator';

type AuthenticatedUser = {
  role: Roles;
  signupIntent: SignupIntent;
};

@Injectable()
export class AccountAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // Public endpoints do not attach a user through the global AuthGuard.
    if (!user) return true;

    const requiredIntents = this.reflector.getAllAndOverride<SignupIntent[]>(
      ACCOUNT_INTENTS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      requiredIntents?.length &&
      !requiredIntents.includes(user.signupIntent)
    ) {
      throw new ForbiddenException(
        'This action is not available for your account type',
      );
    }

    const isTutorApplicant =
      user.role === Roles.STUDENT && user.signupIntent === SignupIntent.TUTOR;

    if (isTutorApplicant) {
      const isAllowed = this.reflector.getAllAndOverride<boolean>(
        ALLOW_TUTOR_APPLICANT_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!isAllowed) {
        throw new ForbiddenException(
          'Complete your tutor application and wait for approval before accessing this feature',
        );
      }
    }

    return true;
  }
}
