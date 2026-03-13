import { Level, StoryType } from '@/generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class StoryListItemDto {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  level: Level;
  status: string; // '연재중' 등
  totalEpisodes: number;
  likeCount: number;
  @ApiProperty({ enum: StoryType })
  type: StoryType;
}
