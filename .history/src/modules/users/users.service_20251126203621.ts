// src/modules/users/users.service.ts

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto'; 
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds a user by email address.
   * Required by the AuthService for login/upsert check.
   */
  async findOneByEmail(email: string) {
    // Assume your Prisma schema has a User model
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Creates a new user in the database.
   * Used during the first social login (upsert).
   */
  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        provider: createUserDto.provider,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        // refreshTokenHash is often null initially
      },
    });
  }

  /**
   * Updates the user's refresh token hash.
   * Essential for JWT security (token reuse prevention and logout).
   */
  async updateRefreshTokenHash(userId: number, token: string | null) {
    // Hash the refresh token before storing it (or set to null on logout)
    const hashedToken = token ? await bcrypt.hash(token, 10) : null;
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hashedToken },
    });
  }
}