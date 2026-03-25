import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CollectionItemDto,
  CollectionsResponseDto,
  EpisodeInProductDto,
  ProductDetailDto,
  ProductItemDto,
  ProductsListResponseDto,
  TopCollectionResponseDto,
} from './dto/product.dto';
import { CollectionKey } from '@/generated/prisma/enums';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCollections(userId?: number): Promise<CollectionsResponseDto> {
    const now = new Date();
    const collections = await this.prisma.collection.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { order: 'asc' },
      include: {
        products: {
          orderBy: { order: 'asc' },
          take: 6,
          include: {
            product: {
              include: {
                episodes: {
                  take: 1,
                  include: {
                    episode: {
                      select: {
                        id: true,
                        title: true,
                        koreanTitle: true,
                        thumbnailUrl: true,
                        story: { select: { id: true, title: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const purchasedProductIds = await this.getPurchasedProductIds(
      userId,
      collections.flatMap((c) => c.products.map((cp) => cp.productId))
    );

    const episodeIds = collections.flatMap((c) =>
      c.products
        .map((cp) => cp.product.episodes?.[0]?.episode?.id)
        .filter((id): id is number => typeof id === 'number')
    );
    const likedEpisodeIds = await this.getLikedEpisodeIds(userId, episodeIds);

    const mapCollection = (c: (typeof collections)[0]): CollectionItemDto => ({
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      order: c.order,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      products: c.products.map((cp) =>
        this.mapProduct(
          cp.product,
          purchasedProductIds,
          userId,
          likedEpisodeIds
        )
      ),
    });

    const topCollection = collections.find((c) => c.key === CollectionKey.TOP);
    const otherCollections = collections.filter(
      (c) => c.key !== CollectionKey.TOP
    );

    return {
      top: topCollection ? mapCollection(topCollection) : null,
      collections: otherCollections.map(mapCollection),
    };
  }

  /** CollectionKey.TOP인 컬렉션 하나 */
  async getTopCollection(userId?: number): Promise<TopCollectionResponseDto> {
    const result = await this.getCollections(userId);
    return { top: result.top };
  }

  /** 전체 상품 목록 */
  async getAllProducts(userId?: number): Promise<ProductsListResponseDto> {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: {
        episodes: {
          take: 1,
          include: {
            episode: {
              select: {
                id: true,
                title: true,
                koreanTitle: true,
                thumbnailUrl: true,
                story: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    const purchasedProductIds = await this.getPurchasedProductIds(
      userId,
      products.map((p) => p.id)
    );

    const episodeIds = products
      .map((p) => p.episodes?.[0]?.episode?.id)
      .filter((id): id is number => typeof id === 'number');
    const likedEpisodeIds = await this.getLikedEpisodeIds(userId, episodeIds);

    return {
      items: products.map((p) =>
        this.mapProduct(p, purchasedProductIds, userId, likedEpisodeIds)
      ),
    };
  }

  async getCollectionProducts(
    collectionId: number,
    query: CursorRequestDto,
    userId?: number
  ): Promise<CursorResponseDto<ProductItemDto>> {
    const { cursor, limit } = query;

    const collectionProducts = await this.prisma.collectionProduct.findMany({
      where: { collectionId },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        product: {
          include: {
            episodes: {
              take: 1,
              include: {
                episode: {
                  select: {
                    id: true,
                    title: true,
                    koreanTitle: true,
                    thumbnailUrl: true,
                    story: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasNext = collectionProducts.length > limit;
    const items = hasNext
      ? collectionProducts.slice(0, limit)
      : collectionProducts;
    const nextCursor = hasNext ? (items[items.length - 1]?.id ?? null) : null;

    const episodeIds = items
      .map((cp) => cp.product.episodes?.[0]?.episode?.id)
      .filter((id): id is number => typeof id === 'number');
    const likedEpisodeIds = await this.getLikedEpisodeIds(userId, episodeIds);

    const purchasedProductIds = await this.getPurchasedProductIds(
      userId,
      items.map((cp) => cp.productId)
    );

    return new CursorResponseDto(
      items.map((cp) =>
        this.mapProduct(
          cp.product,
          purchasedProductIds,
          userId,
          likedEpisodeIds
        )
      ),
      nextCursor
    );
  }

  async getProductDetail(
    productId: number,
    userId?: number
  ): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, isActive: true },
      include: {
        episodes: {
          take: 1,
          include: {
            episode: {
              select: {
                id: true,
                title: true,
                koreanTitle: true,
                thumbnailUrl: true,
                story: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product #${productId} not found`);
    }

    const purchasedProductIds = await this.getPurchasedProductIds(userId, [
      productId,
    ]);

    const episodeId = product.episodes?.[0]?.episode?.id ?? null;
    const likedEpisodeIds = await this.getLikedEpisodeIds(
      userId,
      episodeId !== null ? [episodeId] : []
    );

    return this.mapProduct(
      product,
      purchasedProductIds,
      userId,
      likedEpisodeIds
    );
  }

  // ---------- private ----------

  private async getPurchasedProductIds(
    userId: number | undefined,
    productIds: number[]
  ): Promise<Set<number>> {
    if (!userId || productIds.length === 0) return new Set();
    const purchases = await this.prisma.userPurchase.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    });
    return new Set(purchases.map((p) => p.productId));
  }

  private async getLikedEpisodeIds(
    userId: number | undefined,
    episodeIds: number[]
  ): Promise<Set<number>> {
    if (!userId || episodeIds.length === 0) return new Set();
    const likes = await this.prisma.userEpisodeLike.findMany({
      where: { userId, episodeId: { in: episodeIds } },
      select: { episodeId: true },
    });
    return new Set(likes.map((l) => l.episodeId));
  }

  private mapEpisode(
    ep: {
      episode: {
        id: number;
        title: string;
        koreanTitle: string | null;
        thumbnailUrl: string | null;
        story: { id: number; title: string };
      };
    },
    isLiked?: boolean
  ): EpisodeInProductDto {
    return {
      id: ep.episode.id,
      title: ep.episode.title,
      koreanTitle: ep.episode.koreanTitle,
      thumbnailUrl: ep.episode.thumbnailUrl,
      storyId: ep.episode.story.id,
      storyTitle: ep.episode.story.title,
      ...(typeof isLiked === 'boolean' ? { isLiked } : {}),
    };
  }

  private mapProduct(
    product: any,
    purchasedProductIds: Set<number>,
    userId?: number,
    likedEpisodeIds?: Set<number>
  ): ProductItemDto {
    const firstEpisode = product.episodes?.[0]?.episode;
    const isLiked =
      userId !== undefined && likedEpisodeIds && firstEpisode?.id !== undefined
        ? likedEpisodeIds.has(firstEpisode.id)
        : undefined;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      type: product.type,
      currency: product.currency,
      price: product.price,
      storeSku: product.storeSku,
      thumbnailUrl: product.episodes[0]?.episode?.thumbnailUrl ?? null,
      episode: product.episodes[0]
        ? this.mapEpisode(product.episodes[0], isLiked)
        : null,
      ...(userId !== undefined
        ? { isPurchased: purchasedProductIds.has(product.id) }
        : {}),
    };
  }
}
