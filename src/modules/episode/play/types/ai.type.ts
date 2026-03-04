import { DialogueSpeakerRole } from '@/generated/prisma/enums';
import { Prisma } from '@prisma/client';

export interface CharacterInfo {
  characterId: number | null;
  name: string;
  personality?: string | null;
}

/** dialogue.data JSON 필드 구조 (AI_INPUT_SLOT / AI_SLOT 전용) */
export interface AiSlotDialogueData {
  partnerCharacterIds?: number[];
  constraints?: string[];
  situation?: string;
  includeDialogues?: boolean;
  dataTablePrompt?: string;
}

/** resolveDialogueData에 전달되는 dialogue 최소 타입 */
export interface AiSlotDialogueInput {
  sceneId: number;
  order: number;
  characterId: number | null;
  characterName: string | null;
  speakerRole: DialogueSpeakerRole;
  data: Prisma.JsonValue | null;
}
