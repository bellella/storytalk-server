import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express'; 

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      // 1. Extract the refresh token from the Authorization header (Bearer token)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      // 2. Do not ignore expiration—it must be valid
      ignoreExpiration: false, 
      // 3. Use the dedicated Refresh Token Secret
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'), 
      // 4. Pass the entire request object to the validate method
      //    (Needed to extract the raw token for potential DB validation)
      passReqToCallback: true, 
    });
  }

  /**
   * Called after successful refresh token validation.
   * @param req The request object.
   * @param payload The decoded refresh token payload.
   * @returns The user data and the token itself to be attached to req.user.
   */
  async validate(req: Request, payload: any) {
    // 1. Extract the raw token from the Authorization header
    const refreshToken = req.get('Authorization').replace('Bearer', '').trim(); 
    
    // 2. In a real application, you would check if this refreshToken 
    //    matches the hashed token stored in the User's DB record.
    //    If it matches, the user is valid.

    // 3. Attach validated information to req.user
    return { 
      id: payload.sub, // User ID (from JWT 'sub' claim)
      email: payload.email, 
      refreshToken, // Pass the token along for service validation
    };
  }
}