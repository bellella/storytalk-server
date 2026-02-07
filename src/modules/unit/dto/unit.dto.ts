export class UnitListItemDto {
  id: number;
  title: string;
  description: string;
  color: string;
  order: number;
  story: {
    id: number;
    title: string;
    description: string;
    difficulty: number;
  };
}
export enum EpisodeStatus {
  COMPLETED = 'COMPLETED',
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
}

export class UnitDetailDto {
  id: number;
  title: string;
  description: string;
  difficulty: number;
  episodes: {
    id: number;
    title: string;
    koreanTitle: string;
    description: string;
    /** completed: 이미 시청함, available: 시청 가능, locked: 이전 화 시청 후 잠금 해제 */
    status: EpisodeStatus;
    userEpisode?: {
      id: number;
      isCompleted: boolean;
    };
  }[];
}
