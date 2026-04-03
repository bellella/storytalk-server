import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import {
  CoinTxType,
  CouponBenefitType,
  CouponStatus,
  CouponTargetType,
  CouponUsageStatus,
  UserCouponStatus,
} from '@/generated/prisma/enums';
import { AvailableCouponItemDto, MyCouponItemDto } from './dto/my-coupon.dto';
import { RedeemCoinCouponResponseDto } from './dto/redeem-coin-coupon-response.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 쿠폰 "지급" (코드 입력 없이)
   * - couponId 또는 couponKey 중 하나는 필수
   * - 이미 지급된 쿠폰이면 existing UserCoupon 그대로 반환
   */
  async issueCouponToUser(params: {
    userId: number;
    couponId?: number;
    couponKey?: string;
    source?: string;
    sourceId?: number;
  }): Promise<{ userCouponId: number; couponId: number }> {
    const { userId, couponId, couponKey, source, sourceId } = params;
    if (!couponId && !couponKey) {
      throw new BadRequestException('couponId or couponKey is required');
    }

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        ...(couponId ? { id: couponId } : {}),
        ...(couponKey ? { key: couponKey } : {}),
      },
      select: {
        id: true,
        status: true,
        validFrom: true,
        validUntil: true,
        expiresInDays: true,
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active');
    }

    const existing = await this.prisma.userCoupon.findFirst({
      where: { userId, couponId: coupon.id },
      orderBy: { issuedAt: 'desc' },
      select: { id: true, couponId: true },
    });
    if (existing) {
      return { userCouponId: existing.id, couponId: existing.couponId };
    }

    const now = new Date();
    const validUntil = this.computeValidUntil(
      { validUntil: coupon.validUntil, expiresInDays: coupon.expiresInDays },
      now
    );

    const created = await this.prisma.userCoupon.create({
      data: {
        userId,
        couponId: coupon.id,
        status: UserCouponStatus.AVAILABLE,
        validFrom: coupon.validFrom,
        validUntil,
        source: source ?? null,
        sourceId: sourceId ?? null,
      },
      select: { id: true, couponId: true },
    });

    await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { issuedCount: { increment: 1 } },
    });

    return { userCouponId: created.id, couponId: created.couponId };
  }

  private toIsoOrNull(d: Date | null | undefined): string | null {
    return d ? d.toISOString() : null;
  }

  private computeValidUntil(
    coupon: { validUntil: Date | null; expiresInDays: number | null },
    now: Date
  ): Date | null {
    if (coupon.validUntil) return coupon.validUntil;
    if (coupon.expiresInDays != null) {
      return new Date(
        now.getTime() + coupon.expiresInDays * 24 * 60 * 60 * 1000
      );
    }
    return null;
  }

  private computeDiscountPreview(
    coupon: {
      benefitType: CouponBenefitType;
      discountAmount: number | null;
      discountPercent: number | null;
      maxDiscountAmount: number | null;
    },
    productPrice: number
  ): number {
    let discount = 0;

    if (coupon.benefitType === CouponBenefitType.FIXED_AMOUNT) {
      discount = coupon.discountAmount ?? 0;
    } else if (coupon.benefitType === CouponBenefitType.PERCENTAGE) {
      discount = Math.floor(
        (productPrice * (coupon.discountPercent ?? 0)) / 100
      );
    } else if (coupon.benefitType === CouponBenefitType.FREE_PRODUCT) {
      discount = productPrice;
    }

    if (coupon.maxDiscountAmount != null) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }

    discount = Math.max(0, Math.min(discount, productPrice));
    return discount;
  }

  async getMyCoupons(
    userId: number,
    query: CursorRequestDto
  ): Promise<CursorResponseDto<MyCouponItemDto>> {
    const { cursor, limit } = query;

    const userCoupons = await this.prisma.userCoupon.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        coupon: {
          include: {
            codes: {
              where: { assignedUserId: userId },
              take: 1,
              select: { code: true },
            },
          },
        },
      },
    });

    const hasNext = userCoupons.length > limit;
    const items = hasNext ? userCoupons.slice(0, limit) : userCoupons;
    const nextCursor = hasNext ? (items[items.length - 1]?.id ?? null) : null;

    return new CursorResponseDto(
      items.map((uc) => ({
        userCouponId: uc.id,
        couponId: uc.couponId,
        code: uc.coupon.codes?.[0]?.code ?? null,
        name: uc.coupon.name,
        description: uc.coupon.description ?? null,
        couponStatus: uc.coupon.status,
        benefitType: uc.coupon.benefitType,
        targetType: uc.coupon.targetType,
        targetId: uc.coupon.targetId ?? null,
        status: uc.status,
        issuedAt: this.toIsoOrNull(uc.issuedAt) ?? undefined,
        usedAt: this.toIsoOrNull(uc.usedAt),
        expiredAt: this.toIsoOrNull(uc.expiredAt),
      })),
      nextCursor
    );
  }

  async getAvailableCouponsForProduct(
    userId: number,
    productId: number,
    query: CursorRequestDto
  ): Promise<CursorResponseDto<AvailableCouponItemDto>> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: { id: true, price: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const now = new Date();

    const { cursor, limit } = query;

    const userCoupons = await this.prisma.userCoupon.findMany({
      where: {
        userId,
        status: UserCouponStatus.AVAILABLE,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
          {
            coupon: {
              status: CouponStatus.ACTIVE,
              benefitType: {
                in: [
                  CouponBenefitType.FIXED_AMOUNT,
                  CouponBenefitType.PERCENTAGE,
                  CouponBenefitType.FREE_PRODUCT,
                ],
              },
              AND: [
                {
                  OR: [
                    { minPurchaseAmount: null },
                    { minPurchaseAmount: { lte: product.price } },
                  ],
                },
                {
                  OR: [
                    { targetType: CouponTargetType.ALL },
                    {
                      targetType: CouponTargetType.PRODUCT,
                      targetId: productId,
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        coupon: {
          include: {
            codes: {
              where: { assignedUserId: userId, usedAt: null },
              take: 1,
              select: { code: true },
            },
          },
        },
      },
    });

    const hasNext = userCoupons.length > limit;
    const items = hasNext ? userCoupons.slice(0, limit) : userCoupons;
    const nextCursor = hasNext ? (items[items.length - 1]?.id ?? null) : null;

    return new CursorResponseDto(
      items.map((uc) => {
        const discountPreviewAmount = this.computeDiscountPreview(
          uc.coupon,
          product.price
        );

        return {
          userCouponId: uc.id,
          couponId: uc.couponId,
          code: uc.coupon.codes?.[0]?.code ?? null,
          name: uc.coupon.name,
          description: uc.coupon.description ?? null,
          couponStatus: uc.coupon.status,
          benefitType: uc.coupon.benefitType,
          targetType: uc.coupon.targetType,
          targetId: uc.coupon.targetId ?? null,
          status: uc.status,
          issuedAt: this.toIsoOrNull(uc.issuedAt) ?? undefined,
          usedAt: this.toIsoOrNull(uc.usedAt),
          expiredAt: this.toIsoOrNull(uc.expiredAt),
          discountPreviewAmount,
        };
      }),
      nextCursor
    );
  }

  async redeemCouponCodeToWallet(
    userId: number,
    code: string
  ): Promise<{ success: true; userCouponId: number; couponId: number }> {
    const now = new Date();

    const codeRow = await this.prisma.couponCode.findUnique({
      where: { code },
      include: { coupon: true },
    });
    if (!codeRow) throw new NotFoundException('Invalid coupon code');
    if (codeRow.usedAt) throw new BadRequestException('This coupon code already used');
    if (codeRow.assignedUserId != null && codeRow.assignedUserId !== userId) {
      throw new BadRequestException('This coupon is not for you');
    }

    const coupon = codeRow.coupon;
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active');
    }
    if (coupon.benefitType === CouponBenefitType.COIN_REWARD) {
      throw new BadRequestException('Use coin-redeem for coin reward coupons');
    }

    // 기간 체크 (coupon 기준 + userCoupon 기준)
    if (coupon.validFrom && now < coupon.validFrom) {
      throw new BadRequestException('Coupon not valid yet');
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      throw new BadRequestException('Coupon expired');
    }

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.userCoupon.findFirst({
        where: { userId, couponId: coupon.id },
        orderBy: { issuedAt: 'desc' },
        select: { id: true, couponId: true, status: true },
      });
      if (existing) {
        return { success: true as const, userCouponId: existing.id, couponId: existing.couponId };
      }

      const validUntil = this.computeValidUntil(
        { validUntil: coupon.validUntil, expiresInDays: coupon.expiresInDays },
        now
      );

      const created = await tx.userCoupon.create({
        data: {
          userId,
          couponId: coupon.id,
          status: UserCouponStatus.AVAILABLE,
          validFrom: coupon.validFrom,
          validUntil,
          source: 'COUPON_CODE',
          sourceId: codeRow.id,
        },
        select: { id: true, couponId: true },
      });

      // code는 1회성이라 등록 시점에 소비
      const updatedCode = await tx.couponCode.updateMany({
        where: { id: codeRow.id, usedAt: null },
        data: { usedAt: now, assignedUserId: userId },
      });
      if (updatedCode.count === 0) {
        throw new ConflictException('Coupon code already used');
      }

      await tx.coupon.update({
        where: { id: coupon.id },
        data: { issuedCount: { increment: 1 } },
      });

      return { success: true as const, userCouponId: created.id, couponId: created.couponId };
    });
  }

  /**
   * 쿠폰함의 UserCoupon(AVAILABLE)으로 상품 할인 적용 가능 여부 검증.
   * 할당된 미사용 CouponCode가 있으면 결제 시 소진용으로 함께 반환 (없으면 null).
   */
  async validateDiscountCouponForProductByUserCoupon(params: {
    userId: number;
    productId: number;
    productPrice: number;
    userCouponId: number;
  }): Promise<{
    couponId: number;
    couponCodeId: number | null;
    userCouponId: number;
    discountAmount: number;
  }> {
    const { userId, productId, productPrice, userCouponId } = params;
    const now = new Date();

    const uc = await this.prisma.userCoupon.findFirst({
      where: {
        id: userCouponId,
        userId,
        status: UserCouponStatus.AVAILABLE,
      },
      include: { coupon: true },
    });

    if (!uc) {
      throw new NotFoundException('User coupon not found or not available');
    }

    if (uc.validFrom && now < uc.validFrom) {
      throw new BadRequestException('Coupon not valid yet');
    }
    if (uc.validUntil && now > uc.validUntil) {
      throw new BadRequestException('Coupon expired');
    }
    if (uc.expiredAt) {
      throw new BadRequestException('Coupon expired');
    }

    const coupon = uc.coupon;
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active');
    }

    if (coupon.targetType === CouponTargetType.PRODUCT) {
      if (coupon.targetId !== productId) {
        throw new BadRequestException('Coupon not applicable to this product');
      }
    } else if (coupon.targetType !== CouponTargetType.ALL) {
      throw new BadRequestException('Coupon target type not supported');
    }

    if (
      coupon.minPurchaseAmount != null &&
      productPrice < coupon.minPurchaseAmount
    ) {
      throw new BadRequestException('Purchase amount does not meet minimum');
    }

    if (
      coupon.benefitType !== CouponBenefitType.FIXED_AMOUNT &&
      coupon.benefitType !== CouponBenefitType.PERCENTAGE &&
      coupon.benefitType !== CouponBenefitType.FREE_PRODUCT
    ) {
      throw new BadRequestException(
        'This coupon cannot be applied as discount'
      );
    }

    const codeRow = await this.prisma.couponCode.findFirst({
      where: {
        couponId: coupon.id,
        assignedUserId: userId,
        usedAt: null,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return {
      couponId: coupon.id,
      couponCodeId: codeRow?.id ?? null,
      userCouponId: uc.id,
      discountAmount: this.computeDiscountPreview(coupon, productPrice),
    };
  }

  async applyDiscountCouponToProductPurchase(params: {
    tx: any;
    userId: number;
    couponId: number;
    /** 없으면 코드 없이 쿠폰함만 발급된 경우 — CouponCode 행 갱신 생략 */
    couponCodeId: number | null;
    userCouponId: number;
    userPurchaseId: number;
    discountAmount: number;
  }): Promise<void> {
    const now = new Date();
    const {
      tx,
      userId,
      couponId,
      couponCodeId,
      userCouponId,
      userPurchaseId,
      discountAmount,
    } = params;

    const updatedUserCoupon = await tx.userCoupon.updateMany({
      where: {
        id: userCouponId,
        userId,
        status: UserCouponStatus.AVAILABLE,
      },
      data: { status: UserCouponStatus.USED, usedAt: now },
    });
    if (updatedUserCoupon.count === 0) {
      throw new ConflictException('Coupon already used');
    }

    await tx.couponUsage.create({
      data: {
        userId,
        couponId,
        userCouponId,
        status: CouponUsageStatus.APPLIED,
        userPurchaseId,
        appliedAmount: discountAmount,
      },
    });

    if (couponCodeId != null) {
      const updatedCode = await tx.couponCode.updateMany({
        where: { id: couponCodeId, usedAt: null },
        data: { usedAt: now, assignedUserId: userId },
      });
      if (updatedCode.count === 0) {
        throw new ConflictException('Coupon code already used');
      }
    }

    await tx.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  async redeemCoinRewardCoupon(
    userId: number,
    code: string
  ): Promise<RedeemCoinCouponResponseDto> {
    const now = new Date();
    const codeRow = await this.prisma.couponCode.findUnique({
      where: { code },
      include: { coupon: true },
    });

    if (!codeRow) throw new NotFoundException('Invalid coupon code');
    if (codeRow.assignedUserId != null && codeRow.assignedUserId !== userId) {
      throw new BadRequestException('This coupon is not for you');
    }
    if (codeRow.usedAt) {
      throw new BadRequestException('This coupon code already used');
    }

    const coupon = codeRow.coupon;
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active');
    }
    if (coupon.benefitType !== CouponBenefitType.COIN_REWARD) {
      throw new BadRequestException('This coupon is not a coin reward coupon');
    }

    const reward = coupon.rewardCoinAmount ?? 0;
    if (reward <= 0) throw new BadRequestException('Coupon reward is invalid');

    const userCouponId = await this.prisma.$transaction(async (tx) => {
      let userCoupon = await tx.userCoupon.findFirst({
        where: {
          userId,
          couponId: coupon.id,
          status: UserCouponStatus.AVAILABLE,
        },
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          validFrom: true,
          validUntil: true,
          expiredAt: true,
        },
      });

      if (!userCoupon) {
        const validUntil = this.computeValidUntil(
          {
            validUntil: coupon.validUntil,
            expiresInDays: coupon.expiresInDays,
          },
          now
        );
        userCoupon = await tx.userCoupon.create({
          data: {
            userId,
            couponId: coupon.id,
            status: UserCouponStatus.AVAILABLE,
            validFrom: coupon.validFrom,
            validUntil,
          },
          select: {
            id: true,
            validFrom: true,
            validUntil: true,
            expiredAt: true,
          },
        });
      }

      if (userCoupon.validFrom && now < userCoupon.validFrom) {
        throw new BadRequestException('Coupon not valid yet');
      }
      if (userCoupon.validUntil && now > userCoupon.validUntil) {
        throw new BadRequestException('Coupon expired');
      }
      if (userCoupon.expiredAt) {
        throw new BadRequestException('Coupon expired');
      }

      return userCoupon.id;
    });

    const { balanceAfter } = await this.prisma.$transaction(async (tx) => {
      const latestTx = await tx.coinTransaction.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      });
      const currentBalance = latestTx?.balanceAfter ?? 0;
      const balanceAfter = currentBalance + reward;

      const updatedUserCoupon = await tx.userCoupon.updateMany({
        where: {
          id: userCouponId,
          userId,
          status: UserCouponStatus.AVAILABLE,
        },
        data: { status: UserCouponStatus.USED, usedAt: now },
      });
      if (updatedUserCoupon.count === 0) {
        throw new ConflictException('Coupon already used');
      }

      await tx.couponUsage.create({
        data: {
          userId,
          couponId: coupon.id,
          userCouponId,
          status: CouponUsageStatus.APPLIED,
          appliedAmount: reward,
        },
      });

      const updatedCode = await tx.couponCode.updateMany({
        where: { id: codeRow.id, usedAt: null },
        data: { usedAt: now, assignedUserId: userId },
      });
      if (updatedCode.count === 0) {
        throw new ConflictException('Coupon code already used');
      }

      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          type: CoinTxType.ADMIN_ADJUST,
          amount: reward,
          balanceAfter,
        },
      });

      return { balanceAfter };
    });

    return {
      success: true,
      couponId: coupon.id,
      couponCode: codeRow.code,
      coinRewarded: reward,
      coinBalanceAfter: balanceAfter,
    };
  }
}
