import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // ❗ Instead of throwing error, just return null if no user
    if (err || !user) {
      return null;
    }
    return user;
  }
}