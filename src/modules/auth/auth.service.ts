import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import axios from 'axios';
import { UserService } from '../users/user.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { NaverLoginDto } from './dto/naver-login.dto';
import { AuthProvider } from '@/generated/prisma/enums';
import { SocialLoginResponseDto } from './dto/social-login.dto';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private googleAudiences: string[];

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly couponsService: CouponsService
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

      return await this.handleSocialLogin({
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
      if (error instanceof UnauthorizedException) throw error;
      console.error('[googleLogin] handleSocialLogin error:', error);
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

      return await this.handleSocialLogin({
        provider: AuthProvider.APPLE,
        providerId: appleId,
        email,
        name: name || null,
        profileImage: null,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('[appleLogin] handleSocialLogin error:', error);
      throw new UnauthorizedException('Failed to verify Apple token');
    }
  }

  /**
   * Kakao 로그인 처리
   */
  async kakaoLogin(dto: KakaoLoginDto): Promise<SocialLoginResponseDto> {
    const { accessToken } = dto;

    try {
      const { data } = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const kakaoId = String(data.id);
      const email: string =
        data.kakao_account?.email ?? `kakao_${kakaoId}@kakao.local`;
      const name: string | null = data.kakao_account?.profile?.nickname ?? null;
      const profileImage: string | null =
        data.kakao_account?.profile?.profile_image_url ?? null;

      return await this.handleSocialLogin({
        provider: AuthProvider.KAKAO,
        providerId: kakaoId,
        email,
        name,
        profileImage,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('[kakaoLogin] handleSocialLogin error:', error);
      throw new UnauthorizedException('Failed to verify Kakao token');
    }
  }

  /**
   * Naver 로그인 처리
   */
  async naverLogin(dto: NaverLoginDto): Promise<SocialLoginResponseDto> {
    const { accessToken } = dto;

    try {
      const { data } = await axios.get(
        'https://openapi.naver.com/v1/nid/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const profile = data.response;
      const naverId: string = profile.id;
      const email: string =
        profile.email ?? `naver_${naverId}@naver.local`;
      const name: string | null = profile.name ?? null;
      const profileImage: string | null = profile.profile_image ?? null;

      return await this.handleSocialLogin({
        provider: AuthProvider.NAVER,
        providerId: naverId,
        email,
        name,
        profileImage,
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error('[naverLogin] handleSocialLogin error:', error);
      throw new UnauthorizedException('Failed to verify Naver token');
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

      await this.couponsService.issueCouponToUser({
        userId: user.id,
        couponKey: 'WELCOME_PLAY_EPISODE',
        source: 'SIGNUP',
      });
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        role: user.role,
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
