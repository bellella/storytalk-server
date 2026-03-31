import { ApiProperty } from '@nestjs/swagger';
import { RewardPayloadDto } from '@/modules/episode/dto/episode-complete-response.dto';
import { XpProgressDto } from '@/modules/xp/dto/xp-progress.dto';

/** 출석 지급 결과 — `id` 없음 (`RewardPayloadDto`와 동일 맥락) */
export class GrantedRewardDto extends RewardPayloadDto {}

export class CheckInResponseDto {
  @ApiProperty({ example: '2026-03-28', description: '출석 날짜 (YYYY-MM-DD)' })
  attendanceDate: string;

  @ApiProperty({ type: [GrantedRewardDto], description: '지급된 리워드 목록' })
  rewards: GrantedRewardDto[];

  @ApiProperty({ type: XpProgressDto, description: '출석 XP 지급 후 XP/레벨 상태' })
  xp: XpProgressDto;
}

export class MonthlyAttendanceResponseDto {
  @ApiProperty({
    example: ['2026-03-01', '2026-03-05'],
    description: '출석한 날짜 배열 (YYYY-MM-DD)',
    type: [String],
  })
  dates: string[];
}
