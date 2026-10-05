import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
    protected async getTracker(req: Record<string, any>): Promise<string> {
        return req.user?.id;
    }

    protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        return !req.user;
    }
}