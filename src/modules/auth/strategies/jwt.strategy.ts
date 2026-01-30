import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/types/jwt.type';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private readonly userService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET', ''),
    });
  }

  /**
   * Called after the JWT is successfully verified (signature and expiration are valid).
   */
  async validate(payload: JwtPayload) {
    const userId = Number(payload.sub);

    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User access denied.');
    }

    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
