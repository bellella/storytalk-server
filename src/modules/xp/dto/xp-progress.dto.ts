import { ApiProperty } from '@nestjs/swagger';

export class XpDto {
  @ApiProperty({ description: '현재 레벨' })
  currentLevel: number;

  @ApiProperty({ description: '현재 레벨 구간에서 획득한 XP (진행바용)' })
  xpInCurrentLevel: number;

  @ApiProperty({ nullable: true, description: '다음 레벨 번호 (최고 레벨이면 null)' })
  nextLevel: number | null;

  @ApiProperty({ nullable: true, description: '다음 레벨까지 남은 XP (최고 레벨이면 null)' })
  xpToNextLevel: number | null;

  @ApiProperty({ nullable: true, description: '다음 레벨까지 필요한 누적 XP (최고 레벨이면 null)' })
  requiredTotalXp: number | null;
}

export class XpProgressDto extends XpDto {
  @ApiProperty({ description: '이번 액션으로 획득한 XP' })
  xpGranted: number;

  @ApiProperty({ description: '액션 전 레벨' })
  previousLevel: number;

  @ApiProperty({ description: '이번 액션으로 레벨업 했는지 여부' })
  leveledUp: boolean;
}
