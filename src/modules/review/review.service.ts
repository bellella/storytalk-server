import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserReviewItemDto, UserReviewItemListDto } from './dto/review.dto';

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
      select: {
        englishText: true,
        koreanText: true,
        characterName: true,
        character: { select: { avatarImage: true } },
      },
    });

    return this.mapItem(saved, reviewItem, dialogue);
  }

  async removeReviewItem(userId: number, reviewItemId: number): Promise<void> {
    const item = await this.prisma.userReviewItem.findUnique({
      where: { userId_reviewItemId: { userId, reviewItemId } },
    });
    if (!item) throw new NotFoundException('Not found');

    await this.prisma.userReviewItem.delete({
      where: { userId_reviewItemId: { userId, reviewItemId } },
    });
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
      select: {
        id: true,
        englishText: true,
        koreanText: true,
        characterName: true,
        character: { select: { avatarImage: true } },
      },
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
      englishText: string;
      koreanText: string;
      characterName: string | null;
      character: { avatarImage: string | null } | null;
    } | null
  ): UserReviewItemDto {
    return {
      id: item.id,
      reviewItemId: item.reviewItemId,
      episodeId: reviewItem.episodeId,
      dialogueId: reviewItem.dialogueId,
      description: reviewItem.description,
      order: reviewItem.order,
      dialogue: {
        englishText: dialogue?.englishText ?? '',
        koreanText: dialogue?.koreanText ?? '',
        characterName: dialogue?.characterName ?? null,
        characterAvatarUrl: dialogue?.character?.avatarImage ?? null,
      },
      createdAt: item.createdAt.toISOString(),
    };
  }
}
