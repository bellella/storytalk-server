import { EpisodeStage } from '@/generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UserEpisodeDto {
  id: number;
  userId: number;
  episodeId: number;
  startedAt: Date;
  completedAt: Date | null;
  lastSceneId: number | null;
  @ApiProperty({ enum: EpisodeStage, enumName: 'EpisodeStage' })
  currentStage: EpisodeStage;
  score: number | null;
  isCompleted: boolean;
  meta: any;
  progressPct: number;
}
