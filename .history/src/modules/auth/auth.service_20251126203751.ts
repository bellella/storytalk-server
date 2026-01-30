import { ResumeJson } from '@ai-resume/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService
  ) {}

  /**
   * Registers a new user.
   */
  async signup(signupDto: SignupDto) {
    const { email, password, name } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    // Remove password and timestamps from user info
    const { password: userPassword, createdAt, updatedAt, ...userInfo } = user;

    return {
      token,
      user: {
        ...userInfo,
        defaultResumeJson: userInfo.defaultResumeJson as ResumeJson,
      },
    };
  }

  /**
   * Authenticates a user and generates a JWT token.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Generates Access Token and Refresh Token for the user.
   * @param userId The ID of the authenticated user.
   * @returns An object containing both tokens.
   */
  async getTokens(userId: number, email: string) {
    const payload: JwtPayload = { sub: userId, email };
    
    // 1. Generate Access Token (short lived)
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m', 
      }),
      // 2. Generate Refresh Token (long lived)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d', 
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Called by the social login strategy after successful authentication.
   * Finds or creates a user based on the social profile.
   * @param profile Social provider profile (e.g., Google profile)
   * @param provider 'google' | 'apple'
   * @returns The User object.
   */
  async upsertSocialUser(profile: any, provider: 'google' | 'apple') {
    const email = profile.emails[0].value;
    
    // Check if user exists by email
    let user = await this.usersService.findOneByEmail(email);

    if (!user) {
      // User does not exist, create a new one
      user = await this.usersService.create({
        email,
        provider,
        // Add other profile details like name/picture
      });
    }

    // You might want to update the refresh token hash here for better security.
    return user;
  }
}
