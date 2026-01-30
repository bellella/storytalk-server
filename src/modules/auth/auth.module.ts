import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CommonModule } from '@/common/common.module';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleTokenStrategy } from './strategies/google-token.strategy';
import { LocalStrategy } from './strategies/local-strategy.dto';
import { FirebaseStrategy } from './strategies/firebase.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    CommonModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || '',
      signOptions: { expiresIn: '1d' },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    GoogleTokenStrategy,
    FirebaseStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
