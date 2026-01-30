import { Controller, Get, Param } from '@nestjs/common';
import { StoryService } from '../story/story.service';
import { EpisodeDetailDto } from '../story/dto/episode-detail.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('episodes')
export class EpisodeController {
  constructor(private readonly storyService: StoryService) {}

  @Get(':id')
  @ApiOkResponse({ type: EpisodeDetailDto })
  async getEpisodeDetail(@Param('id') id: string): Promise<EpisodeDetailDto> {
    return await this.storyService.getEpisodeDetail(id);
  }
}
