import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { CurrencyType, ProductType } from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

// ---------- Shared ----------

export class EpisodeInProductDto {
  id: number;
  title: string;
  koreanTitle: string | null;
  thumbnailUrl: string | null;
  storyId: number;
  storyTitle: string;
}

export class ProductItemDto {
  id: number;
  name: string;
  description: string | null;
  type: ProductType;
  currency: CurrencyType;
  price: number;
  storeSku: string | null;
  thumbnailUrl: string | null;
  episode: EpisodeInProductDto | null;
  isPurchased?: boolean;
}

// ---------- Collections ----------

export class CollectionItemDto {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
  products: ProductItemDto[];
}

export class CollectionsResponseDto {
  /** key가 TOP인 컬렉션 (최대 1개) */
  top: CollectionItemDto | null;
  /** TOP가 아닌 컬렉션들 */
  collections: CollectionItemDto[];
}

/** TOP 컬렉션 단일 조회 */
export class TopCollectionResponseDto {
  top: CollectionItemDto | null;
}

/** 전체 상품 목록 */
export class ProductsListResponseDto {
  items: ProductItemDto[];
}

// ---------- Collection Products (cursor) ----------

// ---------- Product Detail ----------

export class ProductDetailDto {
  id: number;
  name: string;
  description: string | null;
  type: ProductType;
  currency: CurrencyType;
  price: number;
  storeSku: string | null;
  episode: EpisodeInProductDto | null;
  thumbnailUrl: string | null;
  isPurchased?: boolean;
}

export class CollectionProductsResponseDto implements CursorResponseDto<ProductItemDto> {
  @ApiProperty({ type: [ProductItemDto] })
  items: ProductItemDto[];
}
