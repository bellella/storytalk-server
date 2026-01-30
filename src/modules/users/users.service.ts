// src/modules/users/users.service.ts

import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@/generated/prisma/client';
import {
  UserCreateInput,
  UserUpdateInput,
  UserWhereUniqueInput,
} from '@/generated/prisma/models';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new user in the database.
   * Used during the first social login (upsert).
   */
  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * Updates the user profile
   */
  updatePersonalInfo(
    userId: number,
    updatePersonalInfoDto: UpdatePersonalInfoDto
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updatePersonalInfoDto,
    });
  }

  /**
   * Deltes a user
   */
  async deleteUser(where: UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }

  /**
   * Finds a user by id.
   */
  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a user by email address.
   * Required by the AuthService for login/upsert check.
   */
  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
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
