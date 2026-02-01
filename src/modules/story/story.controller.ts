import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { StoryDetailDto } from './dto/story-detail.dto';
import { StoryListItemDto } from './dto/story-list-item.dto';
import { EpisodeDetailDto } from './dto/episode-detail.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { StoriesResponseDto } from './dto/story.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { CurrentUser } from '@/types/auth.type';

@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  @ApiOkResponse({ type: StoriesResponseDto })
  async getStories(
    @Query() cursorRequest: CursorRequestDto
  ): Promise<CursorResponseDto<StoryListItemDto>> {
    return await this.storyService.getStories(cursorRequest);
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
