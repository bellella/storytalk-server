import { ReqUser } from '@/common/decorators/user.decorator';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import type { CurrentUser } from '@/types/auth.type';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-auth.guard';
import {
  CollectionProductsResponseDto,
  CollectionsResponseDto,
  ProductDetailDto,
  ProductItemDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * 상품탭 - 컬렉션 목록 (컬렉션별 상품 최대 7개 포함)
   */
  @Get('collections')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: CollectionsResponseDto })
  async getCollections(
    @ReqUser() user?: CurrentUser
  ): Promise<CollectionsResponseDto> {
    return this.productsService.getCollections(user?.id);
  }
  /**
   * 컬렉션 상품 목록 (cursor 페이지네이션)
   */
  @Get('collections/:collectionId/products')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: CollectionProductsResponseDto })
  async getCollectionProducts(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Query() query: CursorRequestDto,
    @ReqUser() user?: CurrentUser
  ): Promise<CollectionProductsResponseDto> {
    return this.productsService.getCollectionProducts(
      collectionId,
      query,
      user?.id
    );
  }

  /**
   * 상품 상세
   */
  @Get(':productId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOkResponse({ type: ProductDetailDto })
  async getProductDetail(
    @Param('productId', ParseIntPipe) productId: number,
    @ReqUser() user?: CurrentUser
  ): Promise<ProductDetailDto> {
    return this.productsService.getProductDetail(productId, user?.id);
  }
}
