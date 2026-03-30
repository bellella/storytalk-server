import { Injectable, NotFoundException } from '@nestjs/common';
import { XpSourceType, XpTriggerType } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { XpDto, XpProgressDto } from './dto/xp-progress.dto';

interface GrantXpParams {
  userId: number;
  triggerType: XpTriggerType;
  sourceType: XpSourceType;
  sourceId: number;
}

@Injectable()
export class XpService {
  constructor(private prisma: PrismaService) {}

  /**
   * XP 지급 + 레벨업 체크
   */
  async grantXp(params: GrantXpParams): Promise<XpProgressDto> {
    const { userId, triggerType, sourceType, sourceId } = params;

    // 1. 이미 지급했는지 확인 (중복 방지)
    const existing = await this.prisma.userXpHistory.findUnique({
      where: {
        userId_sourceType_sourceId_triggerType: {
          userId,
          sourceType,
          sourceId,
          triggerType,
        },
      },
    });

    if (existing) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
      const xpDto = await this.getXpDto(user.xp, user.XpLevel);
      return {
        ...xpDto,
        xpGranted: 0,
        previousLevel: user.XpLevel,
        leveledUp: false,
      };
    }

    // 2. XpRule에서 지급량 조회
    const now = new Date();
    const rule = await this.prisma.xpRule.findFirst({
      where: {
        triggerType,
        isActive: true,
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    if (!rule) {
      throw new NotFoundException(`XP 규칙을 찾을 수 없습니다: ${triggerType}`);
    }

    // 3. XP 지급
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: rule.xpAmount } },
    });

    await this.prisma.userXpHistory.create({
      data: { userId, xpRuleId: rule.id, triggerType, sourceType, sourceId, xpAmount: rule.xpAmount },
    });

    // 4. 레벨업 체크
    const previousLevel = user.XpLevel;
    const { currentLevel, leveledUp } = await this.checkAndLevelUp(userId, user.xp);

    const xpDto = await this.getXpDto(user.xp, currentLevel);

    return {
      ...xpDto,
      xpGranted: rule.xpAmount,
      previousLevel,
      leveledUp,
    };
  }

  /**
   * 누적 XP 기준으로 레벨업 체크 및 적용
   */
  async checkAndLevelUp(
    userId: number,
    currentXp: number
  ): Promise<{ previousLevel: number; currentLevel: number; leveledUp: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const previousLevel = user.XpLevel;
    const newLevel = await this.prisma.xpLevel.findFirst({
      where: { requiredTotalXp: { lte: currentXp }, isActive: true },
      orderBy: { level: 'desc' },
    });

    const currentLevel = newLevel?.level ?? previousLevel;

    if (currentLevel > previousLevel) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { XpLevel: currentLevel },
      });
    }

    return { previousLevel, currentLevel, leveledUp: currentLevel > previousLevel };
  }

  /**
   * 현재 XP 상태 조회 (user/me용)
   */
  async getXpDto(userXp: number, userXpLevel: number): Promise<XpDto> {
    const [currentLevelRow, nextLevelRow] = await Promise.all([
      this.prisma.xpLevel.findFirst({
        where: { level: userXpLevel, isActive: true },
        select: { requiredTotalXp: true },
      }),
      this.prisma.xpLevel.findFirst({
        where: { level: { gt: userXpLevel }, isActive: true },
        orderBy: { requiredTotalXp: 'asc' },
      }),
    ]);

    const floorXp = currentLevelRow?.requiredTotalXp ?? 0;
    const xpInCurrentLevel = Math.max(0, userXp - floorXp);

    return {
      currentLevel: userXpLevel,
      xpInCurrentLevel,
      nextLevel: nextLevelRow?.level ?? null,
      xpToNextLevel: nextLevelRow ? nextLevelRow.requiredTotalXp - userXp : null,
      requiredTotalXp: nextLevelRow?.requiredTotalXp ?? null,
    };
  }
}
