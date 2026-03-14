import { Level, StoryType } from '@/generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { TagItemDto } from './tag-item.dto';

export class StoryListItemDto {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  level: Level;
  status: string; // '연재중' 등
  totalEpisodes: number;
  likeCount: number;
  tags: TagItemDto[];
  @ApiProperty({ enum: StoryType, enumName: 'StoryType' })
  type: StoryType;
}
