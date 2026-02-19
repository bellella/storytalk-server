import { ReqUser } from '@/common/decorators/user.decorator';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import type { CurrentUser } from '@/types/auth.type';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CoinTransactionsResponseDto,
  WalletBalanceDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * 코인 잔액 조회
   */
  @Get()
  @ApiOkResponse({ type: WalletBalanceDto })
  async getBalance(@ReqUser() user: CurrentUser): Promise<WalletBalanceDto> {
    return this.walletService.getBalance(user.id);
  }

  /**
   * 코인 거래 내역 (cursor 페이지네이션, 최신순)
   */
  @Get('transactions')
  @ApiOkResponse({ type: CoinTransactionsResponseDto })
  async getTransactions(
    @Query() query: CursorRequestDto,
    @ReqUser() user: CurrentUser
  ): Promise<CoinTransactionsResponseDto> {
    return this.walletService.getTransactions(user.id, query);
  }
}
