import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@/types/jwt.type';
import { AuthService } from '../auth.service';
import { UsersService } from '@/modules/users/users.service';
import { User } from '@/generated/prisma/client';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh'
) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET', ''),
    });
  }

  /**
   * Called after successful JWT signature validation.
   * Performs a database check to ensure the token matches the stored hash.
   */
  async validate(payload: JwtPayload): Promise<User | null> {
    const userId = payload.sub;

    return this.userService.findOne(userId);
  }
}
