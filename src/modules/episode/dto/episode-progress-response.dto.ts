import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EpisodeStage } from '@/generated/prisma/client';

export class EpisodeProgressDto {
  id: number;
  userId: number;

  episodeId: number;

  startedAt: Date;

  completedAt?: Date | null;

  lastSceneId?: number | null;

  currentStage: EpisodeStage;

  score?: number | null;

  isCompleted: boolean;
}
