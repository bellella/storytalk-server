import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class XpProgressDto {
  @ApiProperty({ description: '이번 액션으로 획득한 XP' })
  xpGranted: number;

  @ApiProperty({ description: '현재까지 누적된 총 XP' })
  totalXp: number;

  @ApiProperty({ description: '액션 전 레벨' })
  previousLevel: number;

  @ApiProperty({ description: '액션 후 레벨' })
  currentLevel: number;

  @ApiProperty({ description: '이번 액션으로 레벨업 했는지 여부' })
  leveledUp: boolean;

  @ApiPropertyOptional({ description: '다음 레벨 번호 (최고 레벨이면 null)' })
  nextLevel?: number | null;

  @ApiPropertyOptional({
    description: '다음 레벨까지 남은 XP (최고 레벨이면 null)',
  })
  xpToNextLevel?: number | null;

  @ApiPropertyOptional({
    description: '다음 레벨까지 필요한 XP (최고 레벨이면 null)',
  })
  requiredTotalXp?: number | null;
}
