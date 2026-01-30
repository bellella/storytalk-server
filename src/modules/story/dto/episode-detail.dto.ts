export class DialogueDto {
  id: string;
  order: number;
  type: string;
  characterName?: string;
  characterId?: string;
  englishText: string;
  koreanText: string;
  charImageLabel?: string;
  imageUrl?: string; // dialogue의 imageUrl 또는 CharacterImage에서 매핑된 imageUrl
  audioUrl?: string;
}

export class SceneDto {
  id: string;
  title: string;
  koreanTitle?: string;
  order: number;
  bgImageUrl?: string;
  audioUrl?: string;
  dialogues: DialogueDto[];
}

export class CharacterImageDto {
  id: string;
  characterId: string;
  imageUrl: string;
  label?: string;
  isDefault: boolean;
}

export class EpisodeDetailDto {
  id: string;
  storyId: string;
  title: string;
  koreanTitle?: string;
  order: number;
  description?: string;
  koreanDescription?: string;
  scenes: SceneDto[];
  characterImages: CharacterImageDto[]; // StoryCharacter에 걸려있는 CharacterImage들
}
