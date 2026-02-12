import { Level } from '@/generated/prisma/client';

export class StoryListItemDto {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  level: Level;
  status: string; // '연재중' 등
  totalEpisodes: number;
  likeCount: number;
}
