import { Controller, Post, Body, Get, HttpStatus, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handles user login.
   */
  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * Handles user signup.
   */
  @Post('signup')
  signup(@Body() signupDto: SignupDto): Promise<SignupResponse> {
    return this.authService.signup(signupDto);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    // Passport adds the user object (from upsertSocialUser) to req.user
    const user = req.user; 
    
    if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).send('Authentication failed.');
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = await this.authService.getTokens(user.id, user.email);

    // Send tokens back, ideally through cookies or redirect to the client's home page
    // For boilerplate simplicity, we'll redirect with tokens in query params (less secure, but shows the flow)
    return res.redirect(`http://localhost:3001/auth/success?access_token=${accessToken}&refresh_token=${refreshToken}`);
  }

  // --- 3. Refresh Token Endpoint ---
  // This endpoint requires JWT (Refresh Token) validation
  @Get('refresh')
  @UseGuards(AuthGuard('jwt-refresh')) // Use a specific guard for refresh token validation
  async refreshTokens(@Req() req) {
    // req.user contains the decoded refresh token payload (id, email)
    const { id, email } = req.user;
    
    return this.authService.getTokens(id, email);
  }
}
