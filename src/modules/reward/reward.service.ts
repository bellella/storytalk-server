import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CharacterRelationStatus,
  CoinTxType,
  RewardSourceType,
  RewardType,
  XpSourceType,
  XpTriggerType,
} from '@/generated/prisma/enums';
import { PrismaClient } from '@/generated/prisma/client';

// PrismaService($transaction 콜백 내 tx)와 PrismaService 모두 수용
type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface GrantedReward {
  type: string;
  payload: Record<string, any>;
}

@Injectable()
export class RewardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * sourceType + sourceId에 해당하는 모든 활성 리워드를 조회하고 지급.
   * grantKeyPrefix: 중복 방지 키 접두사 (e.g. "ending_5_ep_3_user_1")
   */
  async grantRewardsForSource(
    db: Tx,
    userId: number,
    sourceType: RewardSourceType,
    sourceId: number,
    grantKeyPrefix: string
  ): Promise<GrantedReward[]> {
    const rewards = await db.reward.findMany({
      where: { sourceType, sourceId, isActive: true },
    });

    const grantedRewards: GrantedReward[] = [];
    for (const reward of rewards) {
      const grantKey = `${grantKeyPrefix}_r${reward.id}`;
      const result = await this.grantSingle(db, userId, {
        rewardId: reward.id,
        type: reward.type,
        payload: reward.payload as Record<string, any>,
        sourceType,
        sourceId,
        description: reward.description ?? undefined,
        grantKey,
      });
      if (result.granted) {
        grantedRewards.push({ type: result.type, payload: result.payload });
      }
    }
    return grantedRewards;
  }

  /**
   * 단일 리워드 지급 + UserRewardHistory 기록.
   * grantKey가 이미 존재하면 지급하지 않음(중복 방지).
   */
  private async grantSingle(
    db: Tx,
    userId: number,
    reward: {
      rewardId?: number;
      type: RewardType;
      payload: Record<string, any>;
      sourceType: RewardSourceType;
      sourceId?: number;
      description?: string;
      grantKey?: string;
    }
  ): Promise<{ granted: boolean; type: string; payload: Record<string, any> }> {
    // 중복 체크
    if (reward.grantKey) {
      const exists = await db.userRewardHistory.findUnique({
        where: { grantKey: reward.grantKey },
      });
      if (exists) {
        return { granted: false, type: reward.type, payload: reward.payload };
      }
    }

    // 타입별 실제 지급 처리
    switch (reward.type) {
      case RewardType.CHARACTER_INVITE: {
        const characterId = reward.payload.characterId as number | undefined;
        if (!characterId) break;

        const existing = await db.characterFriend.findUnique({
          where: { userId_characterId: { userId, characterId } },
        });
        if (!existing) {
          await db.characterFriend.create({
            data: { userId, characterId, status: CharacterRelationStatus.INVITABLE },
          });
        } else if (existing.status === CharacterRelationStatus.LOCKED) {
          await db.characterFriend.update({
            where: { userId_characterId: { userId, characterId } },
            data: { status: CharacterRelationStatus.INVITABLE },
          });
        } else {
          // 이미 INVITABLE 이상 → 지급 불필요
          return { granted: false, type: reward.type, payload: reward.payload };
        }
        break;
      }

      case RewardType.COIN: {
        const amount = reward.payload.amount as number | undefined;
        if (!amount || amount <= 0) break;

        const latestTx = await db.coinTransaction.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { balanceAfter: true },
        });
        const balanceAfter = (latestTx?.balanceAfter ?? 0) + amount;

        await db.coinTransaction.create({
          data: {
            userId,
            type: CoinTxType.AD_REWARD, // 리워드용 타입 재활용 (필요시 ADMIN_ADJUST)
            amount,
            balanceAfter,
          },
        });
        break;
      }

      case RewardType.XP: {
        const xpAmount = reward.payload.amount as number | undefined;
        if (!xpAmount || xpAmount <= 0) break;

        const user = await db.user.findUniqueOrThrow({
          where: { id: userId },
          select: { xp: true, XpLevel: true },
        });
        const newXp = user.xp + xpAmount;
        const nextLevel = await db.xpLevel.findFirst({
          where: { requiredTotalXp: { lte: newXp }, isActive: true },
          orderBy: { requiredTotalXp: 'desc' },
        });
        await db.user.update({
          where: { id: userId },
          data: { xp: newXp, XpLevel: nextLevel?.level ?? user.XpLevel },
        });
        break;
      }

      case RewardType.COUPON: {
        // TODO: CouponsService 연동 (트랜잭션 미지원으로 임시 스킵)
        break;
      }

      case RewardType.ITEM:
        // 기록만 남김
        break;
    }

    // 지급 이력 기록
    await db.userRewardHistory.create({
      data: {
        userId,
        rewardId: reward.rewardId,
        sourceType: reward.sourceType,
        sourceId: reward.sourceId,
        type: reward.type,
        description: reward.description,
        payload: reward.payload,
        grantKey: reward.grantKey,
      },
    });

    return { granted: true, type: reward.type, payload: reward.payload };
  }
}
