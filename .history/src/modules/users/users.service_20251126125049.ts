import { ResumeJson, UserInfo } from '@ai-resume/types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves user information by user ID
   */
  async getUserInfo(userId: string): Promise<UserInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        defaultResumeJson: true,
        imageUrl: true,
        coins: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      defaultResumeJson: user.defaultResumeJson as ResumeJson,
      imageUrl: user.imageUrl,
      coins: user.coins,
    };
  }

  /**
   * Updates the user profile
   */
  updatePersonalInfo(userId: string, updatePersonalInfoDto: UpdatePersonalInfoDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updatePersonalInfoDto,
    });
  }

  /**
   * Uploads the user's profile image
   */
  uploadProfileImage(file: any) {
    return 'This action uploads the profile image';
  }
}
