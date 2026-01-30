import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoryService } from './story.service';
import { StoryDetailDto } from './dto/story-detail.dto';
import { StoryListItemDto } from './dto/story-list-item.dto';
import { EpisodeDetailDto } from './dto/episode-detail.dto';
import { ApiOkResponse } from '@nestjs/swagger';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { StoriesResponseDto } from './dto/story.dto';

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
  async getStoryDetail(@Param('id') id: string): Promise<StoryDetailDto> {
    return await this.storyService.getStoryDetail(id);
  }
}
