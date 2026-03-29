import { Prisma } from '@/generated/prisma/client';
import { DialogueSpeakerRole } from '@/generated/prisma/enums';

export interface CharacterInfo {
  characterId: number | null;
  name: string;
  personality?: string | null;
  playEpisodePrompt?: string | null;
}

/** dialogue.data JSON 필드 구조 (AI_INPUT_SLOT / AI_SLOT 전용) */
export interface AiSlotDialogueData {
  partnerCharacterIds?: number[];
  /** 제약·지시문 — 통째로 한 덩어리 텍스트 권장. 구버전은 string[] 배열도 허용 */
  constraints?: string | string[];
  situation?: string;
  includeDialogues?: boolean;
  dataTablePrompt?: string;
}

/**
 * constraints: 신규는 string, 구버전 DB의 string[] 은 줄바꿈으로 이어 붙임.
 * {{userName}} 치환은 호출부에서 처리.
 */
export function normalizeAiSlotConstraints(
  raw: unknown,
  replaceUserName: (s: string) => string
): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    const s = replaceUserName(raw.trim());
    return s || undefined;
  }
  if (Array.isArray(raw)) {
    const lines = raw
      .map((c) => replaceUserName(String(c).trim()))
      .filter(Boolean);
    return lines.length ? lines.join('\n') : undefined;
  }
  return undefined;
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
