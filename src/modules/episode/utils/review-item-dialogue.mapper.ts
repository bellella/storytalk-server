import { ReviewItemDialogueDto } from '../dto/review-item.dto';

/** `getReviewItems` / 유저 리뷰 목록에서 공통으로 Dialogue → DTO 변환 */
export function mapDialogueToReviewItemDialogueDto(dialogue: {
  id: number;
  order: number;
  type: string;
  characterName: string | null;
  characterId: number | null;
  englishText: string;
  koreanText: string;
  charImageLabel: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  character: {
    id: number;
    name: string;
    koreanName: string | null;
    avatarImage: string | null;
    mainImage: string | null;
    description: string;
  } | null;
}): ReviewItemDialogueDto {
  return {
    id: dialogue.id,
    order: dialogue.order,
    type: dialogue.type,
    characterName: dialogue.characterName ?? undefined,
    characterId: dialogue.characterId ?? undefined,
    englishText: dialogue.englishText,
    koreanText: dialogue.koreanText,
    charImageLabel: dialogue.charImageLabel ?? undefined,
    imageUrl: dialogue.imageUrl ?? undefined,
    audioUrl: dialogue.audioUrl ?? undefined,
    character: dialogue.character
      ? {
          id: dialogue.character.id,
          name: dialogue.character.name,
          koreanName: dialogue.character.koreanName ?? undefined,
          avatarImage: dialogue.character.avatarImage ?? undefined,
          mainImage: dialogue.character.mainImage ?? undefined,
          description: dialogue.character.description,
        }
      : undefined,
  };
}
