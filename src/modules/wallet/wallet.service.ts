import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ProductType } from '@/generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import {
  CoinTransactionItemDto,
  CoinTransactionPurchaseSummaryDto,
  CoinTransactionsResponseDto,
  WalletBalanceDto,
} from './dto/wallet.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: number): Promise<WalletBalanceDto> {
    const latestTx = await this.prisma.coinTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    return { coinBalance: latestTx?.balanceAfter ?? 0 };
  }

  async getTransactions(
    userId: number,
    query: CursorRequestDto
  ): Promise<CoinTransactionsResponseDto> {
    const { cursor, limit } = query;

    const txs = await this.prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        relatedPurchase: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                thumbnailUrl: true,
              },
            },
            userPlayEpisode: {
              select: {
                episodeId: true,
                episode: {
                  select: {
                    id: true,
                    title: true,
                    storyId: true,
                    story: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasNext = txs.length > limit;
    const items = hasNext ? txs.slice(0, limit) : txs;
    const nextCursor = hasNext ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map(
        (tx): CoinTransactionItemDto => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balanceAfter: tx.balanceAfter,
          relatedPurchaseId: tx.relatedPurchaseId,
          purchase: this.mapPurchaseSummary(tx.relatedPurchase),
          createdAt: tx.createdAt.toISOString(),
        })
      ),
      nextCursor,
    };
  }

  private mapPurchaseSummary(
    up: {
      id: number;
      product: {
        id: number;
        name: string;
        type: ProductType;
        thumbnailUrl: string | null;
      };
      userPlayEpisode: {
        episodeId: number;
        episode: {
          id: number;
          title: string;
          storyId: number | null;
          story: { id: number; title: string } | null;
        };
      } | null;
    } | null
  ): CoinTransactionPurchaseSummaryDto | null {
    if (!up) return null;
    const ep = up.userPlayEpisode?.episode;
    return {
      purchaseId: up.id,
      productId: up.product.id,
      productName: up.product.name,
      productType: up.product.type,
      productThumbnailUrl: up.product.thumbnailUrl,
      episodeId: ep?.id ?? null,
      episodeTitle: ep?.title ?? null,
      storyId: ep?.story?.id ?? ep?.storyId ?? null,
      storyTitle: ep?.story?.title ?? null,
    };
  }
}
