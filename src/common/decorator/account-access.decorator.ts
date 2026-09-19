import { SetMetadata } from '@nestjs/common';
import { SignupIntent } from '@prisma/client';

export const ALLOW_TUTOR_APPLICANT_KEY = 'allowTutorApplicant';
export const ACCOUNT_INTENTS_KEY = 'accountIntents';

export const AllowTutorApplicant = () =>
  SetMetadata(ALLOW_TUTOR_APPLICANT_KEY, true);

export const AccountIntents = (...intents: SignupIntent[]) =>
  SetMetadata(ACCOUNT_INTENTS_KEY, intents);
