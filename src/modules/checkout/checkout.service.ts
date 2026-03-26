import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CoinTxType,
  CurrencyType,
  PlayEpisodeMode,
  PlayEpisodeSource,
  ProductType,
  PurchaseType,
} from '@/generated/prisma/enums';
import { BuyPlayEpisodeResponseDto } from './dto/checkout.dto';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService
  ) {}

  async buyPlayEpisode(
    userId: number,
    productId: number,
    couponCode?: string
  ): Promise<BuyPlayEpisodeResponseDto> {
    // 1. 상품 조회 및 유효성 검증
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
      include: {
        episodes: {
          take: 1,
          select: {
            episodeId: true,
            episode: { select: { playMode: true } },
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }
    if (product.type !== ProductType.PLAY_EPISODE) {
      throw new BadRequestException(
        'This product is not a play episode product'
      );
    }
    if (product.currency !== CurrencyType.COIN) {
      throw new BadRequestException(
        'This product is not purchasable with coins'
      );
    }
    const episodeId = product.episodes[0]?.episodeId;
    if (!episodeId) {
      throw new NotFoundException('No episode linked to this product');
    }

    // 3. 현재 코인 잔액 조회 (최근 CoinTransaction.balanceAfter 기준)
    const latestTx = await this.prisma.coinTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true },
    });
    const currentBalance = latestTx?.balanceAfter ?? 0;

    let discountAmount = 0;
    let couponApplyMeta:
      | {
          couponId: number;
          couponCodeId: number;
          userCouponId: number;
          discountAmount: number;
        }
      | null = null;

    if (couponCode) {
      couponApplyMeta = await this.couponsService.validateDiscountCouponForProduct(
        {
          userId,
          productId,
          productPrice: product.price,
          couponCode,
        }
      );
      discountAmount = couponApplyMeta.discountAmount;
    }

    const netPrice = Math.max(0, product.price - discountAmount);

    if (currentBalance < netPrice) {
      throw new BadRequestException(
        `Insufficient coins. Required: ${netPrice}, available: ${currentBalance}`
      );
    }

    // 4. 구매 처리 (transaction)
    const balanceAfter = currentBalance - netPrice;

    const { purchase, playEpisode } = await this.prisma.$transaction(
      async (tx) => {
        const newPurchase = await tx.userPurchase.create({
          data: {
            userId,
            productId,
            type: PurchaseType.COIN,
            pricePaid: netPrice,
            currency: CurrencyType.COIN,
          },
        });

        await tx.coinTransaction.create({
          data: {
            userId,
            type: CoinTxType.SPEND,
            amount: -netPrice,
            balanceAfter,
            relatedPurchaseId: newPurchase.id,
          },
        });

        if (couponApplyMeta) {
          await this.couponsService.applyDiscountCouponToProductPurchase({
            tx,
            userId,
            couponId: couponApplyMeta.couponId,
            couponCodeId: couponApplyMeta.couponCodeId,
            userCouponId: couponApplyMeta.userCouponId,
            userPurchaseId: newPurchase.id,
            discountAmount: couponApplyMeta.discountAmount,
          });
        }

        const newPlayEpisode = await tx.userPlayEpisode.create({
          data: {
            userId,
            episodeId,
            purchaseId: newPurchase.id,
            source: PlayEpisodeSource.PURCHASE,
            mode:
              product.episodes[0]?.episode?.playMode ??
              PlayEpisodeMode.ROLEPLAY,
          },
        });

        return { purchase: newPurchase, playEpisode: newPlayEpisode };
      }
    );

    return {
      purchaseId: purchase.id,
      playEpisodeId: playEpisode.id,
      productId,
      coinSpent: netPrice,
      coinBalanceAfter: balanceAfter,
    };
  }
}
