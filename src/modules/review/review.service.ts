import { mapDialogueToReviewItemDialogueDto } from '@/modules/episode/utils/review-item-dialogue.mapper';
import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserReviewItemDto, UserReviewItemListDto } from './dto/review.dto';

const dialogueIncludeForReview = {
  character: true,
} as const;

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async addReviewItem(
    userId: number,
    reviewItemId: number
  ): Promise<UserReviewItemDto> {
    const reviewItem = await this.prisma.reviewItem.findUnique({
      where: { id: reviewItemId },
    });
    if (!reviewItem) throw new NotFoundException('ReviewItem not found');

    const existing = await this.prisma.userReviewItem.findUnique({
      where: { userId_reviewItemId: { userId, reviewItemId } },
    });
    if (existing) throw new ConflictException('Already added');

    const saved = await this.prisma.userReviewItem.create({
      data: { userId, reviewItemId },
    });

    const dialogue = await this.prisma.dialogue.findUnique({
      where: { id: reviewItem.dialogueId },
      include: dialogueIncludeForReview,
    });

    return this.mapItem(saved, reviewItem, dialogue);
  }

  async removeReviewItem(
    userId: number,
    userReviewItemId: number
  ): Promise<void> {
    const deleted = await this.prisma.userReviewItem.deleteMany({
      where: { id: userReviewItemId, userId },
    });
    if (deleted.count === 0) throw new NotFoundException('Not found');
  }

  async getUserReviewItems(userId: number): Promise<UserReviewItemListDto> {
    const items = await this.prisma.userReviewItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { reviewItem: true },
    });

    const dialogueIds = items.map((i) => i.reviewItem.dialogueId);
    const dialogues = await this.prisma.dialogue.findMany({
      where: { id: { in: dialogueIds } },
      include: dialogueIncludeForReview,
    });
    const dialogueMap = new Map(dialogues.map((d) => [d.id, d]));

    return {
      items: items.map((i) => {
        const dialogue = dialogueMap.get(i.reviewItem.dialogueId) ?? null;
        return this.mapItem(i, i.reviewItem, dialogue);
      }),
    };
  }

  private mapItem(
    item: { id: number; reviewItemId: number; createdAt: Date },
    reviewItem: {
      id: number;
      episodeId: number;
      dialogueId: number;
      description: string | null;
      order: number;
    },
    dialogue: {
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
    } | null
  ): UserReviewItemDto {
    if (!dialogue) {
      throw new NotFoundException(
        `Dialogue with id ${reviewItem.dialogueId} not found`
      );
    }
    return {
      userReviewItemId: item.id,
      reviewItemId: item.reviewItemId,
      episodeId: reviewItem.episodeId,
      dialogueId: reviewItem.dialogueId,
      description: reviewItem.description,
      order: reviewItem.order,
      dialogue: mapDialogueToReviewItemDialogueDto(dialogue),
      createdAt: item.createdAt.toISOString(),
    };
  }
}
