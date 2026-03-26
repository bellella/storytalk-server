import {
  AdRewardType,
  UsageFeatureType,
} from '@/generated/prisma/client';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdRewardRequestDto,
  AdRewardResponseDto,
  UsageStatusDto,
} from './dto/usage.dto';

const FREE_LIMITS: Record<UsageFeatureType, number> = {
  [UsageFeatureType.EPISODE_READ]: 2,
  [UsageFeatureType.CHARACTER_CHAT]: 10,
};

const AD_REWARD_AMOUNTS: Record<AdRewardType, number> = {
  [AdRewardType.EPISODE_READ]: 1,
  [AdRewardType.CHARACTER_CHAT]: 5,
};

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private getToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async getOrCreateTodayUsage(userId: number, featureType: UsageFeatureType) {
    const today = this.getToday();
    return this.prisma.userUsage.upsert({
      where: { userId_featureType_usageDate: { userId, featureType, usageDate: today } },
      create: {
        userId,
        featureType,
        usageDate: today,
        freeLimit: FREE_LIMITS[featureType],
      },
      update: {},
    });
  }

  async getUsageStatus(userId: number, featureType: UsageFeatureType): Promise<UsageStatusDto> {
    const usage = await this.getOrCreateTodayUsage(userId, featureType);
    const remainingCount = Math.max(0, usage.freeLimit + usage.adRewardedCount - usage.usedCount);
    return {
      featureType,
      usedCount: usage.usedCount,
      freeLimit: usage.freeLimit,
      adRewardedCount: usage.adRewardedCount,
      remainingCount,
      canUse: remainingCount > 0,
    };
  }

  async recordUsage(userId: number, featureType: UsageFeatureType): Promise<void> {
    const usage = await this.getOrCreateTodayUsage(userId, featureType);
    const remaining = usage.freeLimit + usage.adRewardedCount - usage.usedCount;
    if (remaining <= 0) {
      throw new ForbiddenException('USAGE_LIMIT_REACHED');
    }
    await this.prisma.userUsage.update({
      where: { id: usage.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  async grantAdReward(userId: number, dto: AdRewardRequestDto): Promise<AdRewardResponseDto> {
    const { featureType, rewardKey } = dto;
    const rewardAmount = AD_REWARD_AMOUNTS[featureType];
    const today = this.getToday();

    if (rewardKey) {
      const existing = await this.prisma.adRewardLog.findUnique({
        where: { rewardKey },
      });
      if (existing) throw new ConflictException('Ad reward already claimed');
    }

    const featureTypeAsUsage = featureType as unknown as UsageFeatureType;

    const [usage] = await this.prisma.$transaction([
      this.prisma.userUsage.upsert({
        where: {
          userId_featureType_usageDate: {
            userId,
            featureType: featureTypeAsUsage,
            usageDate: today,
          },
        },
        create: {
          userId,
          featureType: featureTypeAsUsage,
          usageDate: today,
          freeLimit: FREE_LIMITS[featureTypeAsUsage],
          adRewardCount: 1,
          adRewardedCount: rewardAmount,
        },
        update: {
          adRewardCount: { increment: 1 },
          adRewardedCount: { increment: rewardAmount },
        },
      }),
      this.prisma.adRewardLog.create({
        data: {
          userId,
          type: featureType,
          rewardAmount,
          usageDate: today,
          ...(rewardKey ? { rewardKey } : {}),
        },
      }),
    ]);

    const remainingCount = Math.max(0, usage.freeLimit + usage.adRewardedCount - usage.usedCount);
    return { featureType, rewardAmount, remainingCount };
  }
}
