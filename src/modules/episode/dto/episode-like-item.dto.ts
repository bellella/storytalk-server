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

  @ApiPropertyOptional({
    description:
      'PLAY 타입 에피소드인 경우 연결된 상품 id (EpisodeProduct 기반)',
  })
  productId?: number | null;

  @ApiProperty()
  isLiked: boolean;
}
