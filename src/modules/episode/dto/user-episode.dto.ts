import { EpisodeStage } from '@/generated/prisma/client';

export class UserEpisodeDto {
  id: number;
  userId: number;
  episodeId: number;
  startedAt: Date;
  completedAt: Date | null;
  lastSceneId: number | null;
  currentStage: EpisodeStage;
  score: number | null;
  isCompleted: boolean;
  meta: any;
  progressPct: number;
}
