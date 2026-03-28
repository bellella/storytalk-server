import { ApiProperty } from '@nestjs/swagger';

export class GrantedRewardDto {
  @ApiProperty({ example: 'COIN', description: '리워드 타입' })
  type: string;

  @ApiProperty({
    example: { amount: 100 },
    description: '리워드 payload (타입마다 다름)',
  })
  payload: Record<string, any>;
}

export class CheckInResponseDto {
  @ApiProperty({ example: '2026-03-28', description: '출석 날짜 (YYYY-MM-DD)' })
  attendanceDate: string;

  @ApiProperty({ type: [GrantedRewardDto], description: '지급된 리워드 목록' })
  rewards: GrantedRewardDto[];
}

export class MonthlyAttendanceResponseDto {
  @ApiProperty({
    example: ['2026-03-01', '2026-03-05'],
    description: '출석한 날짜 배열 (YYYY-MM-DD)',
    type: [String],
  })
  dates: string[];
}
