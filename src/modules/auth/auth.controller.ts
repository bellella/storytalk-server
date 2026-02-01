import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
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
}
