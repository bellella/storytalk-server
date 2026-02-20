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
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-auth.guard';
import { StoryDetailDto } from './dto/story-detail.dto';
import { StoryListItemDto } from './dto/story-list-item.dto';
import { RecentlyPlayedEpisodeItemDto, StoriesResponseDto } from './dto/story.dto';
import { TagItemDto } from './dto/tag-item.dto';
import { StoryService } from './story.service';

@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  @ApiOkResponse({ type: StoriesResponseDto })
  @ApiQuery({
    name: 'tag',
    required: false,
    type: String,
    description: '필터링할 태그 slug (옵셔널)',
  })
  async getStories(
    @Query() cursorRequest: CursorRequestDto,
    @Query('tag') tag?: string
  ): Promise<CursorResponseDto<StoryListItemDto>> {
    return await this.storyService.getStories(cursorRequest, tag);
  }

  @Get('tags')
  @ApiOkResponse({ type: [TagItemDto] })
  async getTags(): Promise<TagItemDto[]> {
    return await this.storyService.getTags();
  }

  @Get('recently-played')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: [RecentlyPlayedEpisodeItemDto] })
  async getRecentlyPlayedEpisodes(
    @ReqUser() user: CurrentUser
  ): Promise<RecentlyPlayedEpisodeItemDto[]> {
    return this.storyService.getRecentlyPlayedEpisodes(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: StoryDetailDto })
  @UseGuards(OptionalJwtAuthGuard)
  async getStoryDetail(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: CurrentUser | undefined
  ): Promise<StoryDetailDto> {
    return await this.storyService.getStoryDetail(id, user);
  }
}
