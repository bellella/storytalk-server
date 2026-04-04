import { ReviewItemDialogueDto } from '@/modules/episode/dto/review-item.dto';

export class UserReviewItemDto {
  /** UserReviewItem PK — 삭제 시 `DELETE .../items/saved/:userReviewItemId`에 넣을 값 */
  userReviewItemId: number;
  reviewItemId: number;
  episodeId: number;
  dialogueId: number;
  description: string | null;
  order: number;
  dialogue: ReviewItemDialogueDto;
  createdAt: string;
}

export class UserReviewItemListDto {
  items: UserReviewItemDto[];
}
