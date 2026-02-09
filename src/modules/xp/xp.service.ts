import { Injectable, NotFoundException } from '@nestjs/common';
import { XpSourceType, XpTriggerType } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface GrantXpParams {
  userId: number;
  triggerType: XpTriggerType;
  sourceType: XpSourceType;
  sourceId: number;
}

interface GrantXpResult {
  xpGranted: number;
  totalXp: number;
  previousLevel: number;
  currentLevel: number;
  leveledUp: boolean;
  nextLevel: number | null;
  xpToNextLevel: number | null;
  requiredTotalXp: number | null;
}

@Injectable()
export class XpService {
  constructor(private prisma: PrismaService) {}

  /**
   * XP 지급 + 레벨업 체크
   * - XpRule에서 triggerType에 맞는 규칙 조회 (priority 높은 것 우선)
   * - UserXpHistory에 기록 (중복 지급 방지)
   * - User.xp 증가 후 레벨업 체크
   */
  async grantXp(params: GrantXpParams): Promise<GrantXpResult> {
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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('유저를 찾을 수 없습니다.');
      }
      const { nextLevel, xpToNextLevel, requiredTotalXp } =
        await this.getNextLevelInfo(user.xp, user.XpLevel);
      return {
        xpGranted: 0,
        totalXp: user.xp,
        previousLevel: user.XpLevel,
        currentLevel: user.XpLevel,
        leveledUp: false,
        nextLevel,
        xpToNextLevel,
        requiredTotalXp,
      };
    }

    // 2. XpRule에서 지급량 조회 (priority 높은 것 + 유효기간 내)
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

    // 3. XP 지급: User.xp 증가 + UserXpHistory 기록
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: rule.xpAmount } },
    });

    await this.prisma.userXpHistory.create({
      data: {
        userId,
        xpRuleId: rule.id,
        triggerType,
        sourceType,
        sourceId,
        xpAmount: rule.xpAmount,
      },
    });

    // 4. 레벨업 체크
    const previousLevel = user.XpLevel;
    const { currentLevel, leveledUp } = await this.checkAndLevelUp(
      userId,
      user.xp
    );

    const { nextLevel, xpToNextLevel, requiredTotalXp } =
      await this.getNextLevelInfo(user.xp, currentLevel);

    return {
      xpGranted: rule.xpAmount,
      totalXp: user.xp,
      previousLevel,
      currentLevel,
      leveledUp,
      nextLevel,
      xpToNextLevel,
      requiredTotalXp,
    };
  }

  /**
   * 누적 XP 기준으로 레벨업 체크 및 적용
   * - XpLevel 테이블에서 현재 XP로 도달 가능한 최고 레벨 조회
   * - User.XpLevel 업데이트
   */
  async checkAndLevelUp(
    userId: number,
    currentXp: number
  ): Promise<{
    previousLevel: number;
    currentLevel: number;
    leveledUp: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const previousLevel = user.XpLevel;

    // 현재 XP로 도달 가능한 최고 레벨
    const newLevel = await this.prisma.xpLevel.findFirst({
      where: {
        requiredTotalXp: { lte: currentXp },
        isActive: true,
      },
      orderBy: { level: 'desc' },
    });

    const currentLevel = newLevel?.level ?? previousLevel;

    if (currentLevel > previousLevel) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { XpLevel: currentLevel },
      });
    }

    return {
      previousLevel,
      currentLevel,
      leveledUp: currentLevel > previousLevel,
    };
  }

  /**
   * 다음 레벨 및 남은 XP 계산
   */
  private async getNextLevelInfo(
    currentXp: number,
    currentLevel: number
  ): Promise<{
    nextLevel: number | null;
    xpToNextLevel: number | null;
    requiredTotalXp: number | null;
  }> {
    const nextLevelRow = await this.prisma.xpLevel.findFirst({
      where: {
        level: { gt: currentLevel },
        isActive: true,
      },
      orderBy: { requiredTotalXp: 'asc' },
    });

    if (!nextLevelRow) {
      return { nextLevel: null, xpToNextLevel: null, requiredTotalXp: null };
    }

    return {
      nextLevel: nextLevelRow.level,
      xpToNextLevel: nextLevelRow.requiredTotalXp - currentXp,
      requiredTotalXp: nextLevelRow.requiredTotalXp,
    };
  }
}
