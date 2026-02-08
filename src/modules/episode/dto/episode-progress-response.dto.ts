import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EpisodeStage } from '@/generated/prisma/client';

export class EpisodeProgressResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  episodeId: number;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  lastSceneId?: number | null;

  @ApiProperty({ enum: EpisodeStage })
  currentStage: EpisodeStage;

  @ApiPropertyOptional()
  score?: number | null;

  @ApiProperty()
  isCompleted: boolean;
}
