import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import {
  CoinTransactionItemDto,
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
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        relatedPurchaseId: true,
        createdAt: true,
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
          createdAt: tx.createdAt.toISOString(),
        })
      ),
      nextCursor,
    };
  }
}
