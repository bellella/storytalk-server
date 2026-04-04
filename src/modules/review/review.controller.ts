import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewService } from './review.service';
import { UserReviewItemDto, UserReviewItemListDto } from './dto/review.dto';

@Controller('review')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /** 카탈로그 `ReviewItem.id`로 담기 */
  @Post('items/catalog/:reviewItemId')
  @ApiOkResponse({ type: UserReviewItemDto })
  addReviewItem(
    @ReqUser('id') userId: number,
    @Param('reviewItemId', ParseIntPipe) reviewItemId: number
  ): Promise<UserReviewItemDto> {
    return this.reviewService.addReviewItem(userId, reviewItemId);
  }

  /** 목록의 `userReviewItemId`로 빼기 */
  @Delete('items/saved/:userReviewItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeReviewItem(
    @ReqUser('id') userId: number,
    @Param('userReviewItemId', ParseIntPipe) userReviewItemId: number
  ): Promise<void> {
    return this.reviewService.removeReviewItem(userId, userReviewItemId);
  }

  @Get('items')
  @ApiOkResponse({ type: UserReviewItemListDto })
  getUserReviewItems(
    @ReqUser('id') userId: number
  ): Promise<UserReviewItemListDto> {
    return this.reviewService.getUserReviewItems(userId);
  }
}
