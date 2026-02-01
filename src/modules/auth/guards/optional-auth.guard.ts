import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // super.canActivate는 boolean | Promise<boolean> | Observable<boolean>
      const result = (await super.canActivate(context)) as boolean;
      return result;
    } catch (err) {
      // JWT 없거나 invalid token이면 그냥 통과 (req.user는 undefined)
      return true;
    }
  }

  handleRequest(err, user, info) {
    // 로그인 안 했으면 undefined, 로그인 했으면 user
    return user ?? undefined;
  }
}
