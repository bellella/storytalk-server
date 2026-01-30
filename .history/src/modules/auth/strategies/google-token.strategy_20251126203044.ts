// src/modules/auth/strategies/google-access-token.strategy.ts

import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom'; 
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios'; 
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleAccessStrategy extends PassportStrategy(Strategy, 'google-token') {
  constructor(
    private readonly httpService: HttpService, // Injected HttpService
    private readonly authService: AuthService,
  ) {
    super();
  }

  // The validate method takes the request object directly
  async validate(req: Request): Promise<any> {
    // Assume the client sends the Access Token in the body (e.g., req.body.accessToken)
    const accessToken = req.body.accessToken;

    if (!accessToken) {
      throw new UnauthorizedException('Google Access Token not found in the request body.');
    }

    try {
      // 1. Request user info from Google's endpoint using the Access Token
      const { data } = await this.httpService.axiosRef.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // 2. Validate essential fields (security check)
      if (!data.email || !data.email_verified) {
        throw new UnauthorizedException('Email is not verified or missing.');
      }
      
      // 3. Create a structure similar to the ID Token payload for upsert
      const userProfile = {
          email: data.email, 
          providerId: data.sub, // Google's unique user ID
          firstName: data.given_name,
          lastName: data.family_name,
      };

      // 4. Use AuthService to find/create the user (upsert)
      const user = await this.authService.upsertSocialUser(userProfile, 'google');

      return user; // Attached to req.user
      
    } catch (e) {
      // If HTTP call or token verification fails
      console.error('Google Access Token verification failed:', e);
      throw new UnauthorizedException('Invalid or expired Google Access Token.');
    }
  }
}