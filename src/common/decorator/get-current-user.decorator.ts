// src/auth/decorators/get-current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (data: keyof any | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If @GetCurrentUser('email') passed → return user.email
    return data ? user?.[data] : user;
  },
);
