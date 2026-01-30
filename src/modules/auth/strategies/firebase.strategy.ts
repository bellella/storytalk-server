import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { AuthService } from '../auth.service';
import { AuthUser, SocialProvider } from '@/types/auth.type';
import { FirebaseLoginDto } from '../dto/firebase-login.dto';

@Injectable()
export class FirebaseStrategy extends PassportStrategy(
  Strategy,
  'firebase-auth'
) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request): Promise<AuthUser> {
    const body = req.body as FirebaseLoginDto;
    const idToken = body.idToken;

    if (!idToken) {
      throw new UnauthorizedException('Firebase ID Token is missing.');
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      const providerDomain = decodedToken.firebase.sign_in_provider; // 'google.com'
      const provider = providerDomain.split('.')[0] as SocialProvider; // 'google'
      let email = decodedToken.email;
      if (!email) {
        email = `${decodedToken.uid}@${providerDomain}`;
      }
      const userProfile = {
        email,
        providerId: decodedToken.uid, // Firebase UID
        firstName: decodedToken.name || '',
        lastName: '',
      };

      return this.authService.upsertSocialUser(userProfile, provider);
    } catch (e) {
      console.error('Firebase Token Error:', e);
      throw new UnauthorizedException('Invalid Firebase Token.');
    }
  }
}
