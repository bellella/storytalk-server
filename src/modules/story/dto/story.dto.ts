import {
  EpisodeStage,
  EpisodeType,
  Level,
  StoryType,
} from '@/generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { StoryListItemDto } from './story-list-item.dto';

export class StoriesResponseDto {
  @ApiProperty({ type: () => StoryListItemDto, isArray: true })
  items: StoryListItemDto[];
}

export class RecentlyPlayedStoryDto {
  id: number;
  title: string;
  koreanTitle: string | null;
  type: StoryType;
  level: Level;
  icon: string;
  coverImage: string | null;
}

export class RecentlyPlayedEpisodeDto {
  id: number;
  title: string;
  koreanTitle: string | null;
  order: number;
  thumbnailUrl: string | null;
  @ApiProperty({ enum: EpisodeType, enumName: 'EpisodeType' })
  type: EpisodeType;
  @ApiProperty({ nullable: true, required: false })
  playEpisodeId?: number | null;
  isLiked?: boolean;
}

export class UserEpisodeProgressDto {
  @ApiProperty({ enum: EpisodeStage, enumName: 'EpisodeStage' })
  currentStage: EpisodeStage;
  isCompleted: boolean;
  score: number | null;
  lastSceneId: number | null;
  startedAt: string;
  completedAt: string | null;
}

export class RecentlyPlayedEpisodeItemDto {
  story: RecentlyPlayedStoryDto;
  episode: RecentlyPlayedEpisodeDto;
  userEpisode: UserEpisodeProgressDto;
}
