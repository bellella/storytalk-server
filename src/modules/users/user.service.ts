import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthProvider, User } from '@/generated/prisma/client';
import { UserCreateInput } from '@/generated/prisma/models';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { RegisterProfileDto, UserDto, UserProfileDto } from './dto/user.dto';

@Injectable()
export class UserService {
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
   * Finds a user by id.
   */
  async findOne(id: number): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      level: user.level,
      xp: user.xp,
      streakDays: user.streakDays,
    };
  }

  /**
   * Finds a user by email address.
   * Required by the AuthService for login/upsert check.
   */
  async findOneByEmailAndProvider(email: string, provider: AuthProvider) {
    return this.prisma.user.findUnique({
      where: { email_provider: { email, provider } },
    });
  }

  async completeProfile(
    userId: number,
    registerProfileDto: RegisterProfileDto
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isNew: false,
        name: registerProfileDto.name,
        registeredAt: new Date(),
      },
    });
  }
}
