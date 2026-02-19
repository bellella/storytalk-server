import { CoinTxType } from '@/generated/prisma/enums';

export class WalletBalanceDto {
  coinBalance: number;
}

export class CoinTransactionItemDto {
  id: number;
  type: CoinTxType;
  amount: number;
  balanceAfter: number;
  relatedPurchaseId: number | null;
  createdAt: string;
}

export class CoinTransactionsResponseDto {
  items: CoinTransactionItemDto[];
  nextCursor: number | null;
}
