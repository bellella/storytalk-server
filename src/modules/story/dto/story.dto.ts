import { EpisodeStage, Level, StoryType } from '@/generated/prisma/client';
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
}

export class UserEpisodeProgressDto {
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
