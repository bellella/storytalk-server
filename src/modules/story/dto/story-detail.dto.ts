import { Level } from '@/generated/prisma/client';
import { UserEpisodeDto } from '@/modules/episode/dto/user-episode.dto';

export class StoryDetailDto {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  level: Level; // 시안의 'Intermediate' 등에 매핑
  status: string; // '연재중' 등
  totalEpisodes: number;
  likeCount: number; // 임시 필드 (필요시 DB 추가)
  characters: {
    id: number;
    name: string;
    description?: string;
    avatarImage?: string;
  }[];
  episodes: {
    id: number;
    title: string;
    order: number;
    duration: string; // '5 min' 등
    userEpisode?: UserEpisodeDto;
  }[];
}
