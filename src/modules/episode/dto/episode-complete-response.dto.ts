import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType } from '@/generated/prisma/client';

/** 공통: DB Reward 한 건의 타입 + payload (지급 스냅샷·표시 공통) */
export class RewardPayloadDto {
  @ApiProperty({ enum: RewardType, enumName: 'RewardType' })
  type: RewardType;

  @ApiProperty({ description: '리워드 상세 정보(JSON)' })
  payload: Record<string, any>;
}

export class UnlockedCharacterDto {
  @ApiProperty()
  characterId: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarImageUrl: string | null;
}

/** 퀴즈 완료 / 플레이 result 등 — Reward 행 id + 캐릭터 해금 메타 */
export class EpisodeRewardDto extends RewardPayloadDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional({ type: UnlockedCharacterDto, nullable: true })
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
  @ApiProperty({ type: EpisodeMetaDto })
  episode: EpisodeMetaDto;

  @ApiProperty({ type: [EpisodeRewardDto] })
  rewards: EpisodeRewardDto[];
}
