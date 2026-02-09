import { ApiProperty } from '@nestjs/swagger';
import { RewardType } from '@/generated/prisma/client';
import { XpProgressDto } from '@/modules/xp/dto/xp-progress.dto';

export class EpisodeRewardDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: RewardType })
  type: RewardType;

  @ApiProperty({ description: '리워드 상세 정보(JSON)' })
  payload: Record<string, any>;
}

export class EpisodeMetaDto {
  @ApiProperty()
  episodeId: number;

  @ApiProperty({ description: '에피소드 제목' })
  episodeTitle: string;

  @ApiProperty({ description: '몇 화인지 (에피소드 순서)' })
  episodeOrder: number;

  @ApiProperty()
  storyId: number;

  @ApiProperty({ description: '스토리 제목' })
  storyTitle: string;
}

export class EpisodeCompleteResponseDto {
  @ApiProperty({ type: XpProgressDto })
  xp: XpProgressDto;

  @ApiProperty({ type: EpisodeMetaDto })
  episode: EpisodeMetaDto;

  @ApiProperty({ type: [EpisodeRewardDto] })
  rewards: EpisodeRewardDto[];
}

