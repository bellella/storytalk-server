/**
 * Character.data.greetingMessage — { englishText?, koreanText? }
 * 한국어 우선, 없으면 영어, 둘 다 없으면 기본 문구
 */
export function greetingContentFromCharacterData(
  data: unknown,
  characterName: string
): string {
  const d = data as Record<string, unknown> | null | undefined;
  const gm = d?.greetingMessage as
    | { englishText?: string; koreanText?: string }
    | undefined;
  const ko = gm?.koreanText?.trim();
  const en = gm?.englishText?.trim();
  if (ko) return ko;
  if (en) return en;
  return `안녕! 나는 ${characterName}야. 잘 부탁해!`;
}
