export class StoryListItemDto {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  category: string;
  difficulty: number;
  status: string; // '연재중' 등
  totalEpisodes: number;
  likeCount: number;
}
