import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getSeoulNowDay } from '@/common/utils/date.util';
import { RewardSourceType, XpSourceType, XpTriggerType } from '@/generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService, GrantedReward } from '../reward/reward.service';
import { XpService } from '../xp/xp.service';
import { XpProgressDto } from '../xp/dto/xp-progress.dto';

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
   * - Reward 테이블에서 sourceType=ATTENDANCE인 활성 리워드 전부 지급 (sourceId로 조회하지 않음)
   */
  async checkIn(userId: number): Promise<{
    attendanceDate: string;
    rewards: GrantedReward[];
    xp: XpProgressDto;
  }> {
    const { start: today, ymdKey: attendanceDateKey, ymdString } =
      getSeoulNowDay();

    const existing = await this.prisma.userAttendance.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: today } },
    });

    if (existing) {
      throw new BadRequestException('Already checked in today');
    }

    const userBefore = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { XpLevel: true },
    });
    if (!userBefore) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const { granted: rewards, xpGained } = await this.prisma.$transaction(
      async (tx) => {
        await tx.userAttendance.create({
          data: { userId, attendanceDate: today },
        });

        const grantKey = `attendance_u${userId}_${ymdString}`;

        const granted = await this.rewardService.grantRewardsForSourceType(
          tx,
          userId,
          RewardSourceType.ATTENDANCE,
          grantKey
        );

        const { xpGained } = await this.xpService.grantXpWithinTransaction(tx, {
          userId,
          triggerType: XpTriggerType.ATTENDANCE,
          sourceType: XpSourceType.ATTENDANCE,
          sourceId: attendanceDateKey,
        });

        return { granted, xpGained };
      }
    );

    const xp = await this.xpService.buildXpProgressAfterGrant(
      userId,
      xpGained,
      userBefore.XpLevel
    );

    return {
      attendanceDate: ymdString,
      rewards,
      xp,
    };
  }

  /**
   * 이번 달 출석 목록 조회
   * TODO: API 쓰기 전에 `from`/`to`를 서버 로컬이 아니라 Asia/Seoul 달력 월 경계로 바꿀 것 (`startOfSeoulCalendarDay` 등).
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
