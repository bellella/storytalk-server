import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthProvider, QuizSessionType, User } from '@/generated/prisma/client';
import { UserCreateInput } from '@/generated/prisma/models';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { RegisterProfileDto, UserDto, UserProfileDto } from './dto/user.dto';
import { getTodayRange } from '@/common/utils/date.util';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

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
    const { start: todayStart, end: todayEnd } = getTodayRange();
    const [user, dailySession] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        include: {
          selectedCharacter: {
            select: { id: true, avatarImage: true },
          },
        },
      }),
      this.prisma.userQuizSession.findFirst({
        select: { completedAt: true },
        where: {
          userId: id,
          type: QuizSessionType.DAILY_QUIZ,
          startedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextLevelRow = await this.prisma.xpLevel.findFirst({
      where: { level: { gt: user.XpLevel }, isActive: true },
      orderBy: { requiredTotalXp: 'asc' },
      select: { requiredTotalXp: true },
    });
    const xpToNextLevel = nextLevelRow
      ? nextLevelRow.requiredTotalXp - user.xp
      : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      role: user.role,
      level: user.level,
      xpLevel: user.XpLevel,
      xp: user.xp,
      xpToNextLevel,
      dailyStatus: {
        quizCompleted: !!dailySession?.completedAt,
      },
      selectedCharacter: user.selectedCharacter
        ? {
            id: user.selectedCharacter.id,
            avatarImage: user.selectedCharacter.avatarImage,
          }
        : null,
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

  async withdrawMe(userId: number): Promise<SuccessResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const uniqueSuffix = `${userId}_${Date.now()}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        // 계정 식별 정보를 익명화해 재로그인을 막고, 참조 무결성은 유지한다.
        email: `withdrawn+${uniqueSuffix}@storytalk.local`,
        providerId: `withdrawn_${uniqueSuffix}`,
        name: null,
        profileImage: null,
        selectedCharacterId: null,
      },
    });

    return {
      success: true,
      message: '회원 탈퇴가 완료되었습니다.',
    };
  }
}
