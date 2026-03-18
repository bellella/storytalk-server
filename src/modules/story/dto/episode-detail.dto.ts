import { DialogueSpeakerRole, DialogueType, SceneFlowType, SceneType } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class ChoiceOptionDto {
  key: string;
  englishText: string;
  koreanText: string;
}

export class DialogueDto {
  id: number;
  order: number;
  @ApiProperty({ enum: DialogueType, enumName: 'DialogueType' })
  type: DialogueType;
  @ApiProperty({ enum: DialogueSpeakerRole, enumName: 'DialogueSpeakerRole' })
  speakerRole: DialogueSpeakerRole;
  characterName?: string;
  characterId?: number;
  englishText: string;
  koreanText: string;
  charImageLabel?: string;
  imageUrl?: string; // dialogue의 imageUrl 또는 CharacterImage에서 매핑된 imageUrl
  audioUrl?: string;
  options?: ChoiceOptionDto[]; // CHOICE_SLOT 전용: 선택지 목록
}

export class SceneDto {
  id: number;
  title: string;
  @ApiProperty({ enum: SceneType, enumName: 'SceneType' })
  type: SceneType;
  @ApiProperty({ enum: SceneFlowType, enumName: 'SceneFlowType' })
  flowType: SceneFlowType;
  branchKey?: string; // BRANCH 씬의 라우트 키 (branch-trigger에서 매칭용)
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
  totalScenes?: number | null; // 메인 경로 씬 수 (프론트 진행도 표시용)
  scenes: SceneDto[];
  characterImages: CharacterImageDto[]; // StoryCharacter에 걸려있는 CharacterImage들
}
