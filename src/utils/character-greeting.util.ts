/**
 * Character.data.greetingMessage — { englishText?, koreanText? }
 * 메시지: content = 영어, payload.translated = 한국어
 */
export function greetingPartsFromCharacterData(
  data: unknown,
  characterName: string
): { content: string; payload: { translated: string } } {
  const d = data as Record<string, unknown> | null | undefined;
  const gm = d?.greetingMessage as
    | { englishText?: string; koreanText?: string }
    | undefined;
  const ko = gm?.koreanText?.trim();
  const en = gm?.englishText?.trim();

  const defaultKo = `안녕! 나는 ${characterName}야. 잘 부탁해!`;
  const defaultEn = `Hi! I'm ${characterName}. Nice to meet you!`;

  if (en && ko) {
    return { content: en, payload: { translated: ko } };
  }
  if (en && !ko) {
    return { content: en, payload: { translated: defaultKo } };
  }
  if (!en && ko) {
    return { content: defaultEn, payload: { translated: ko } };
  }
  return { content: defaultEn, payload: { translated: defaultKo } };
}

/** 채팅방 등 표시용: 영어 본문(없으면 기본 영어) */
export function greetingContentFromCharacterData(
  data: unknown,
  characterName: string
): string {
  return greetingPartsFromCharacterData(data, characterName).content;
}
