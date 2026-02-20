import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@/generated/prisma/client';
import { XpProgressDto } from '@/modules/xp/dto/xp-progress.dto';

export class UnlockedCharacterDto {
  @ApiProperty()
  characterId: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarImageUrl: string | null;
}

export class EpisodeRewardDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: RewardType })
  type: RewardType;

  @ApiProperty({ description: '리워드 상세 정보(JSON)' })
  payload: Record<string, any>;

  @ApiProperty({ type: UnlockedCharacterDto, nullable: true, required: false })
  unlockedCharacter?: UnlockedCharacterDto | null;
}

export class EpisodeMetaDto {
  @ApiProperty()
  episodeId: number;

  @ApiProperty({ description: '에피소드 제목' })
  episodeTitle: string;

  @ApiProperty({ description: '몇 화인지 (에피소드 순서)' })
  episodeOrder: number;

  @ApiProperty()
  @ApiPropertyOptional()
  storyId?: number;

  @ApiProperty({ description: '스토리 제목' })
  @ApiPropertyOptional()
  storyTitle?: string;
}

export class EpisodeCompleteResponseDto {
  @ApiProperty({ type: XpProgressDto })
  xp: XpProgressDto;

  @ApiProperty({ type: EpisodeMetaDto })
  episode: EpisodeMetaDto;

  @ApiProperty({ type: [EpisodeRewardDto] })
  rewards: EpisodeRewardDto[];
}
