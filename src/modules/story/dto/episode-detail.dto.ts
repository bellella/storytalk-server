import { DialogueSpeakerRole, DialogueType, SceneType } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class DialogueDto {
  id: number;
  order: number;
  @ApiProperty({ enum: DialogueType })
  type: DialogueType;
  @ApiProperty({ enum: DialogueSpeakerRole })
  speakerRole: DialogueSpeakerRole;
  characterName?: string;
  characterId?: number;
  englishText: string;
  koreanText: string;
  charImageLabel?: string;
  imageUrl?: string; // dialogue의 imageUrl 또는 CharacterImage에서 매핑된 imageUrl
  audioUrl?: string;
}

export class SceneDto {
  id: number;
  title: string;
  @ApiProperty({ enum: SceneType })
  type: SceneType;
  koreanTitle?: string;
  order: number;
  bgImageUrl?: string;
  audioUrl?: string;
  dialogues: DialogueDto[];
}

export class CharacterImageDto {
  id: number;
  characterId: number;
  imageUrl: string;
  label?: string;
  isDefault: boolean;
}

export class EpisodeDetailDto {
  id: number;
  storyId?: number;
  title: string;
  koreanTitle?: string;
  order: number;
  description?: string;
  koreanDescription?: string;
  thumbnailUrl?: string | null;
  scenes: SceneDto[];
  characterImages: CharacterImageDto[]; // StoryCharacter에 걸려있는 CharacterImage들
}
