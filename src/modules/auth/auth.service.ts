import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { UserService } from '../users/user.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { AuthProvider } from '@/generated/prisma/enums';
import { SocialLoginResponseDto } from './dto/social-login.dto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private googleAudiences: string[];

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    this.googleClient = new OAuth2Client();
    this.googleAudiences = [
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_APP_CLIENT_ID'),
    ].filter(Boolean) as string[];
  }

  /**
   * Google 로그인 처리
   */
  async googleLogin(dto: GoogleLoginDto) {
    const { idToken } = dto;

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleAudiences,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { sub: googleId, email, name, picture } = payload;

      if (!email) {
        throw new UnauthorizedException('Email not provided by Google');
      }

      return this.handleSocialLogin({
        provider: AuthProvider.GOOGLE,
        providerId: googleId,
        email,
        name: name || null,
        profileImage: picture || null,
      });
    } catch (error) {
      // 토큰의 실제 aud 확인용 (디버깅 후 삭제)
      try {
        const [, b64Payload] = idToken.split('.');
        const decoded = JSON.parse(
          Buffer.from(b64Payload, 'base64').toString()
        );
      } catch {}
      throw new UnauthorizedException('Failed to verify Google token');
    }
  }

  /**
   * Apple 로그인 처리
   */
  async appleLogin(dto: AppleLoginDto) {
    const { identityToken, name } = dto;

    try {
      const applePayload = await appleSignin.verifyIdToken(identityToken, {
        audience: this.configService.get<string>('APPLE_CLIENT_ID'),
        ignoreExpiration: false,
      });

      const { sub: appleId, email } = applePayload;

      if (!email) {
        throw new UnauthorizedException('Email not provided by Apple');
      }

      return this.handleSocialLogin({
        provider: AuthProvider.APPLE,
        providerId: appleId,
        email,
        name: name || null,
        profileImage: null,
      });
    } catch (error) {
      throw new UnauthorizedException('Failed to verify Apple token');
    }
  }

  /**
   * 소셜 로그인 공통 처리 (회원가입 or 로그인)
   */
  private async handleSocialLogin(data: {
    provider: AuthProvider;
    providerId: string;
    email: string;
    name: string | null;
    profileImage: string | null;
  }): Promise<SocialLoginResponseDto> {
    let user = await this.userService.findOneByEmailAndProvider(
      data.email,
      data.provider
    );
    let isNew = user?.isNew ?? false;

    // 유저 정보 없음
    if (!user) {
      user = await this.userService.create({
        email: data.email,
        name: data.name,
        provider: data.provider,
        providerId: data.providerId,
        profileImage: data.profileImage,
        isNew: true,
      });
      isNew = true;
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
      },
      tokens,
      isNew,
    };
  }

  /**
   * Access Token 및 Refresh Token 생성
   */
  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
