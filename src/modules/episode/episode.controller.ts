import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';
import { StoryService } from '../story/story.service';
import { EpisodeService } from './episode.service';
import { EpisodeDetailDto } from '../story/dto/episode-detail.dto';
import { ReviewItemDto } from './dto/review-item.dto';
import { QuizDto } from './dto/quiz.dto';
import { EpisodeProgressDto } from './dto/episode-progress-response.dto';
import { EpisodeCompleteResponseDto } from './dto/episode-complete-response.dto';
import { UpdateEpisodeProgressDto } from './dto/scene-complete.dto';

@Controller('episodes')
export class EpisodeController {
  constructor(
    private readonly storyService: StoryService,
    private readonly episodeService: EpisodeService
  ) {}

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

  // ── 에피소드 진행 엔드포인트 ──

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: EpisodeProgressDto })
  async startEpisode(
    @Param('id', ParseIntPipe) episodeId: number,
    @ReqUser('id') userId: number
  ): Promise<EpisodeProgressDto> {
    return this.episodeService.startEpisode(userId, episodeId);
  }

  @Patch(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async updateEpisodeProgress(
    @Param('id', ParseIntPipe) episodeId: number,
    @ReqUser('id') userId: number,
    @Body() dto: UpdateEpisodeProgressDto
  ): Promise<SuccessResponseDto> {
    return this.episodeService.updateEpisodeProgress(
      userId,
      episodeId,
      dto.sceneId
    );
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: EpisodeCompleteResponseDto })
  async completeEpisode(
    @Param('id', ParseIntPipe) episodeId: number,
    @ReqUser('id') userId: number
  ): Promise<EpisodeCompleteResponseDto> {
    return this.episodeService.completeEpisode(userId, episodeId);
  }
}
