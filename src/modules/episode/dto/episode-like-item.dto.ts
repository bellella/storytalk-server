import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EpisodeType } from '@/generated/prisma/client';

export class EpisodeLikeItemDto {
  id: number;
  title: string;
  koreanTitle: string | null;
  order: number;
  thumbnailUrl: string | null;

  @ApiProperty({ enum: EpisodeType, enumName: 'EpisodeType' })
  type: EpisodeType;

  @ApiPropertyOptional()
  storyId?: number;

  @ApiPropertyOptional()
  storyTitle?: string;

  @ApiProperty()
  isLiked: boolean;
}
