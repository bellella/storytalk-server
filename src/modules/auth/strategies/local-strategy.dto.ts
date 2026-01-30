// src/modules/auth/strategies/local.strategy.ts

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@/generated/prisma/client';

/**
 * Passport strategy for local username/password authentication.
 * Used by AuthGuard('local') for POST /auth/login.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Use email as the username field
    });
  }

  /**
   * Validates the user credentials against the database.
   * @param email The user's email address.
   * @param password The user's raw password.
   * @returns The User entity if credentials are valid.
   * @throws UnauthorizedException if credentials are invalid.
   */
  async validate(email: string, password: string): Promise<any> {
    // AuthService handles the lookup and bcrypt comparison
    const user = await this.authService.validateLocalUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    // Passport attaches this user object to req.user
    return user as User;
  }
}
