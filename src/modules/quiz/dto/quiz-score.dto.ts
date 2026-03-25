import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { XpProgressDto } from '@/modules/xp/dto/xp-progress.dto';
import { EpisodeRewardDto } from '@/modules/episode/dto/episode-complete-response.dto';

export class QuizScoreDto {
  @ApiProperty({ description: '전체 문항 수' })
  totalCount: number;

  @ApiProperty({ description: '맞춘 문항 수' })
  correctCount: number;

  @ApiProperty({ description: '점수(정답률, 0~100%)' })
  score: number;

  @ApiPropertyOptional({ type: XpProgressDto })
  xp?: XpProgressDto;

  @ApiPropertyOptional({ type: [EpisodeRewardDto] })
  rewards?: EpisodeRewardDto[];
}
