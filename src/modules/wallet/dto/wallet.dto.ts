import { CoinTxType, ProductType } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceDto {
  coinBalance: number;
}

/** SPEND 등 relatedPurchaseId가 있을 때 조인된 구매·상품·에피소드 요약 */
export class CoinTransactionPurchaseSummaryDto {
  purchaseId: number;
  productId: number;
  productName: string;
  @ApiProperty({ enum: ProductType, enumName: 'ProductType' })
  productType: ProductType;
  productThumbnailUrl: string | null;
  episodeId: number | null;
  episodeTitle: string | null;
  storyId: number | null;
  storyTitle: string | null;
}

export class CoinTransactionItemDto {
  id: number;
  /** CoinTxType 한글 표시명 (TOPUP→코인 충전, SPEND→구매 등) */
  @ApiProperty({ enum: CoinTxType, enumName: 'CoinTxType' })
  type: CoinTxType;
  amount: number;
  balanceAfter: number;
  relatedPurchaseId: number | null;
  /** 구매와 연결된 경우에만 — 상품·에피소드·스토리 조인 */
  purchase: CoinTransactionPurchaseSummaryDto | null;
  createdAt: string;
}

export class CoinTransactionsResponseDto {
  items: CoinTransactionItemDto[];
  nextCursor: number | null;
}
