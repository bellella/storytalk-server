import { ReqUser } from '@/common/decorators/user.decorator';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { ParseIntPipe } from '@nestjs/common';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUser } from '@/types/auth.type';
import { RedeemCoinCouponDto } from './dto/redeem-coin-coupon.dto';
import { RedeemCoinCouponResponseDto } from './dto/redeem-coin-coupon-response.dto';
import { CouponsService } from './coupons.service';
import {
  AvailableCouponsResponseDto,
  MyCouponsResponseDto,
} from './dto/coupon-cursor-response.dto';
import { RedeemCouponCodeDto } from './dto/redeem-coupon-code.dto';
import { RedeemCouponCodeResponseDto } from './dto/redeem-coupon-code-response.dto';

@ApiTags('Coupons')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  /**
   * 유저 쿠폰 코드 등록 (쿠폰함에 추가)
   * - 할인/무료쿠폰: AVAILABLE 상태로 추가
   * - 코인지급 쿠폰은 여기서 등록 불가 (coin-redeem 사용)
   */
  @Post('redeem')
  @ApiOkResponse({ type: RedeemCouponCodeResponseDto })
  async redeemCouponCode(
    @ReqUser() user: CurrentUser,
    @Body() dto: RedeemCouponCodeDto
  ): Promise<RedeemCouponCodeResponseDto> {
    return this.couponsService.redeemCouponCodeToWallet(user.id, dto.code);
  }

  /** 내 쿠폰 목록 조회 */
  @Get('me')
  @ApiOkResponse({ type: MyCouponsResponseDto })
  async getMyCoupons(
    @Query() query: CursorRequestDto,
    @ReqUser('id') userId: number
  ): Promise<MyCouponsResponseDto> {
    return this.couponsService.getMyCoupons(userId, query);
  }

  /**
   * 특정 상품에 사용 가능한 내 쿠폰 조회
   * GET /coupons/available?productId=1
   */
  @Get('available')
  @ApiOkResponse({ type: AvailableCouponsResponseDto })
  async getAvailableCouponsForProduct(
    @Query('productId', ParseIntPipe) productId: number,
    @Query() query: CursorRequestDto,
    @ReqUser('id') userId: number
  ): Promise<AvailableCouponsResponseDto> {
    return this.couponsService.getAvailableCouponsForProduct(
      userId,
      productId,
      query
    );
  }

  /** 코인 지급 쿠폰 바로 사용 (COIN_REWARD) */
  @Post('coin-redeem')
  @ApiOkResponse({ type: RedeemCoinCouponResponseDto })
  async redeemCoinRewardCoupon(
    @ReqUser() user: CurrentUser,
    @Body() dto: RedeemCoinCouponDto
  ): Promise<RedeemCoinCouponResponseDto> {
    return this.couponsService.redeemCoinRewardCoupon(user.id, dto.code);
  }
}
