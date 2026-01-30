export class StoryDetailDto {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  category: string;
  difficulty: number; // 시안의 'Intermediate' 등에 매핑
  status: string; // '연재중' 등
  totalEpisodes: number;
  likeCount: number; // 임시 필드 (필요시 DB 추가)
  characters: {
    id: string;
    name: string;
    description?: string;
    avatarImage?: string;
  }[];
  episodes: {
    id: string;
    title: string;
    order: number;
    duration: string; // '5 min' 등
  }[];
}
