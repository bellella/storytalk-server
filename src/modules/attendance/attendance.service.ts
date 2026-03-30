import { BadRequestException, Injectable } from '@nestjs/common';
import { RewardSourceType, XpSourceType, XpTriggerType } from '@/generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService, GrantedReward } from '../reward/reward.service';
import { XpService } from '../xp/xp.service';

const ATTENDANCE_REWARD_SOURCE_ID = 1;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
    private readonly xpService: XpService
  ) {}

  /**
   * 오늘 출석 체크.
   * - 이미 출석했으면 오류
   * - UserAttendance 생성
   * - Reward 테이블에 sourceType=ATTENDANCE, sourceId=1인 활성 리워드 지급
   */
  async checkIn(userId: number): Promise<{
    attendanceDate: string;
    rewards: GrantedReward[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.userAttendance.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: today } },
    });

    if (existing) {
      throw new BadRequestException('Already checked in today');
    }

    const attendanceDateKey =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();

    const rewards = await this.prisma.$transaction(async (tx) => {
      await tx.userAttendance.create({
        data: { userId, attendanceDate: today },
      });

      const grantKey = `attendance_u${userId}_${today.toISOString().slice(0, 10)}`;

      const granted = await this.rewardService.grantRewardsForSource(
        tx,
        userId,
        RewardSourceType.ATTENDANCE,
        ATTENDANCE_REWARD_SOURCE_ID,
        grantKey
      );

      await this.xpService.grantXpWithinTransaction(tx, {
        userId,
        triggerType: XpTriggerType.ATTENDANCE,
        sourceType: XpSourceType.ATTENDANCE,
        sourceId: attendanceDateKey,
      });

      return granted;
    });

    return {
      attendanceDate: today.toISOString().slice(0, 10),
      rewards,
    };
  }

  /**
   * 이번 달 출석 목록 조회
   */
  async getMonthlyAttendance(
    userId: number,
    year: number,
    month: number
  ): Promise<string[]> {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const records = await this.prisma.userAttendance.findMany({
      where: {
        userId,
        attendanceDate: { gte: from, lte: to },
      },
      select: { attendanceDate: true },
      orderBy: { attendanceDate: 'asc' },
    });

    return records.map((r) => r.attendanceDate.toISOString().slice(0, 10));
  }
}
