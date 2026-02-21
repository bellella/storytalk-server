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
} from './dto/product.dto';

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
          take: 7,
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

    return {
      collections: collections.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnailUrl,
        order: c.order,
        startsAt: c.startsAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        products: c.products.map((cp) =>
          this.mapProduct(cp.product, purchasedProductIds, userId)
        ),
      })) satisfies CollectionItemDto[],
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
                    story: { select: { id: true, title: true } },
                  },
                },
                product: { select: { thumbnailUrl: true } },
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

    const purchasedProductIds = await this.getPurchasedProductIds(
      userId,
      items.map((cp) => cp.productId)
    );

    return new CursorResponseDto(
      items.map((cp) =>
        this.mapProduct(cp.product, purchasedProductIds, userId)
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

    return this.mapProduct(product, purchasedProductIds, userId);
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

  private mapEpisode(ep: {
    episode: {
      id: number;
      title: string;
      koreanTitle: string | null;
      thumbnailUrl: string | null;
      story: { id: number; title: string };
    };
  }): EpisodeInProductDto {
    return {
      id: ep.episode.id,
      title: ep.episode.title,
      koreanTitle: ep.episode.koreanTitle,
      thumbnailUrl: ep.episode.thumbnailUrl,
      storyId: ep.episode.story.id,
      storyTitle: ep.episode.story.title,
    };
  }

  private mapProduct(
    product: any,
    purchasedProductIds: Set<number>,
    userId?: number
  ): ProductItemDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      type: product.type,
      currency: product.currency,
      price: product.price,
      storeSku: product.storeSku,
      thumbnailUrl: product.thumbnailUrl,
      episode: product.episodes[0]
        ? this.mapEpisode(product.episodes[0])
        : null,
      ...(userId !== undefined
        ? { isPurchased: purchasedProductIds.has(product.id) }
        : {}),
    };
  }
}
