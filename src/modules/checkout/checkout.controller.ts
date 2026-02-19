import { ReqUser } from '@/common/decorators/user.decorator';
import type { CurrentUser } from '@/types/auth.type';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutService } from './checkout.service';
import { BuyPlayEpisodeDto, BuyPlayEpisodeResponseDto } from './dto/checkout.dto';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * 코인으로 에피소드 구매
   */
  @Post('play-episode')
  @ApiOkResponse({ type: BuyPlayEpisodeResponseDto })
  async buyPlayEpisode(
    @Body() body: BuyPlayEpisodeDto,
    @ReqUser() user: CurrentUser
  ): Promise<BuyPlayEpisodeResponseDto> {
    return this.checkoutService.buyPlayEpisode(user.id, body.productId);
  }
}
