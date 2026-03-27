import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { NaverLoginDto } from './dto/naver-login.dto';
import { SocialLoginResponseDto } from './dto/social-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @ApiOperation({ summary: 'Google 로그인' })
  @ApiResponse({ type: SocialLoginResponseDto })
  async googleLogin(
    @Body() dto: GoogleLoginDto
  ): Promise<SocialLoginResponseDto> {
    return this.authService.googleLogin(dto);
  }

  @Post('apple')
  @ApiOperation({ summary: 'Apple 로그인' })
  @ApiResponse({ type: SocialLoginResponseDto })
  async appleLogin(
    @Body() dto: AppleLoginDto
  ): Promise<SocialLoginResponseDto> {
    return this.authService.appleLogin(dto);
  }

  @Post('kakao')
  @ApiOperation({ summary: 'Kakao 로그인' })
  @ApiResponse({ type: SocialLoginResponseDto })
  async kakaoLogin(
    @Body() dto: KakaoLoginDto
  ): Promise<SocialLoginResponseDto> {
    return this.authService.kakaoLogin(dto);
  }

  @Post('naver')
  @ApiOperation({ summary: 'Naver 로그인' })
  @ApiResponse({ type: SocialLoginResponseDto })
  async naverLogin(
    @Body() dto: NaverLoginDto
  ): Promise<SocialLoginResponseDto> {
    return this.authService.naverLogin(dto);
  }
}
