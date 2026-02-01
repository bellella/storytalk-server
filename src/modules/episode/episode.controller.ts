import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { StoryService } from '../story/story.service';
import { EpisodeDetailDto } from '../story/dto/episode-detail.dto';
import { ReviewItemDto } from './dto/review-item.dto';
import { QuizDto } from './dto/quiz.dto';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('episodes')
export class EpisodeController {
  constructor(private readonly storyService: StoryService) {}

  @Get(':id')
  @ApiOkResponse({ type: EpisodeDetailDto })
  async getEpisodeDetail(
    @Param('id', ParseIntPipe) id: number
  ): Promise<EpisodeDetailDto> {
    return await this.storyService.getEpisodeDetail(id);
  }

  @Get(':id/review-items')
  @ApiOkResponse({ type: [ReviewItemDto] })
  async getReviewItems(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ReviewItemDto[]> {
    return await this.storyService.getReviewItems(id);
  }

  @Get(':id/quizzes')
  @ApiOkResponse({ type: [QuizDto] })
  async getQuizzes(@Param('id', ParseIntPipe) id: number): Promise<QuizDto[]> {
    return await this.storyService.getQuizzes(id);
  }
}
