import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/types/auth.type';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      // 1. How to extract the token from the request (Bearer Token in Authorization header)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      // 2. Ignore expiration must be false (Check expiration date)
      ignoreExpiration: false, 
      // 3. Secret key for token verification (Uses JWT_ACCESS_SECRET)
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'), 
    });
  }

  /**
   * Called after the JWT is successfully verified (signature and expiration are valid).
   * @param payload The decoded JWT payload { sub: userId, email: string }.
   * @returns The user data to be attached to req.user (e.g., req.user.id, req.user.email).
   */
  async validate(payload: JwtPayload) {
    // NOTE: In advanced security setups, you would query the DB here 
    // to check if the user is banned or still active before returning.
    
    // For boilerplate simplicity, we just return the essential payload data:
    return { 
      id: payload.sub, // The user ID, typically stored in the 'sub' field
      email: payload.email 
    };
  }
}