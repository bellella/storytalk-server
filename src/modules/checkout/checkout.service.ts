import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CoinTxType, CurrencyType, ProductType, PurchaseType } from '@/generated/prisma/enums';
import { BuyPlayEpisodeResponseDto } from './dto/checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async buyPlayEpisode(
    userId: number,
    productId: number
  ): Promise<BuyPlayEpisodeResponseDto> {
    // 1. 상품 조회 및 유효성 검증
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }
    if (product.type !== ProductType.PLAY_EPISODE) {
      throw new BadRequestException('This product is not a play episode product');
    }
    if (product.currency !== CurrencyType.COIN) {
      throw new BadRequestException('This product is not purchasable with coins');
    }

    // 2. 중복 구매 방지
    const existing = await this.prisma.userPurchase.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new ConflictException('Already purchased this product');
    }

    // 3. 현재 코인 잔액 조회 (최근 CoinTransaction.balanceAfter 기준)
    const latestTx = await this.prisma.coinTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    const currentBalance = latestTx?.balanceAfter ?? 0;

    if (currentBalance < product.price) {
      throw new BadRequestException(
        `Insufficient coins. Required: ${product.price}, available: ${currentBalance}`
      );
    }

    // 4. 구매 처리 (transaction)
    const balanceAfter = currentBalance - product.price;

    const purchase = await this.prisma.$transaction(async (tx) => {
      const newPurchase = await tx.userPurchase.create({
        data: {
          userId,
          productId,
          type: PurchaseType.COIN,
          pricePaid: product.price,
          currency: CurrencyType.COIN,
        },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          type: CoinTxType.SPEND,
          amount: -product.price,
          balanceAfter,
          relatedPurchaseId: newPurchase.id,
        },
      });

      return newPurchase;
    });

    return {
      purchaseId: purchase.id,
      productId,
      coinSpent: product.price,
      coinBalanceAfter: balanceAfter,
    };
  }
}
