export class ReviewItemDialogueDto {
  id: number;
  order: number;
  type: string;
  characterName?: string;
  characterId?: number;
  englishText: string;
  koreanText: string;
  charImageLabel?: string;
  imageUrl?: string;
  audioUrl?: string;
  character?: {
    id: number;
    name: string;
    koreanName?: string;
    avatarImage?: string;
    mainImage?: string;
    description: string;
  };
}

export class ReviewItemDto {
  id: number;
  episodeId: number;
  dialogueId: number;
  description?: string;
  order: number;
  dialogue: ReviewItemDialogueDto;
}
