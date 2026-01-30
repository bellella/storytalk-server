import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '@/types/jwt.type';
import { LocalRegisterDto } from './dto/local-auth.dto';
import { User } from '@/generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthUser, SocialProfile, SocialProvider } from '@/types/auth.type';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private jwtService: JwtService
  ) {}

  /**
   * Registers a new user with email and password.
   */
  async registerLocalUser(localRegisterDto: LocalRegisterDto): Promise<User> {
    const existingUser = await this.usersService.findOneByEmail(
      localRegisterDto.email
    );
    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists.');
    }

    // Hash the password before storage
    const hashedPassword = await bcrypt.hash(localRegisterDto.password, 10);

    // Call UsersService to create the user
    return this.usersService.create({
      ...localRegisterDto,
      password: hashedPassword,
      provider: 'local',
    });
  }

  /**
   * Validates local user credentials (used by LocalStrategy).
   * @returns The User entity if credentials are valid, otherwise null.
   */
  async validateLocalUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user || !user.password) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);

    if (isMatch) {
      // Credentials are valid
      return user;
    }
    return null;
  }

  /**
   * Finds or creates a user based on the social profile.
   * Handles Shopify account creation and returns the new user flag.
   */
  async upsertSocialUser(
    profile: SocialProfile,
    provider: SocialProvider
  ): Promise<AuthUser> {
    const email = profile.email;
    let user = await this.usersService.findOneByEmail(email);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await this.usersService.create({
        email,
        provider,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    }

    return { user, isNewUser };
  }

  /**
   * Generates Access Token and Refresh Token for the user.
   */
  async getTokens(userId: number, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    // Generate Access Token (short lived)
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '3d',
      }),
      // Generate Refresh Token (long lived)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
