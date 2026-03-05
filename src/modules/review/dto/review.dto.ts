export class UserReviewItemDto {
  id: number;
  reviewItemId: number;
  episodeId: number;
  dialogueId: number;
  description: string | null;
  order: number;
  dialogue: {
    englishText: string;
    koreanText: string;
    characterName: string | null;
    characterAvatarUrl: string | null;
  };
  createdAt: string;
}

export class UserReviewItemListDto {
  items: UserReviewItemDto[];
}
