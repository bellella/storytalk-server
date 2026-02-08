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
import { StoryService } from '../story/story.service';
import { EpisodeService } from './episode.service';
import { EpisodeDetailDto } from '../story/dto/episode-detail.dto';
import { ReviewItemDto } from './dto/review-item.dto';
import { QuizDto } from './dto/quiz.dto';
import { SceneCompleteDto } from './dto/scene-complete.dto';
import { EpisodeProgressResponseDto } from './dto/episode-progress-response.dto';

@Controller('episodes')
@ApiTags('episodes')
export class EpisodeController {
  constructor(
    private readonly storyService: StoryService,
    private readonly episodeService: EpisodeService,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: EpisodeDetailDto })
  async getEpisodeDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EpisodeDetailDto> {
    return await this.storyService.getEpisodeDetail(id);
  }

  @Get(':id/review-items')
  @ApiOkResponse({ type: [ReviewItemDto] })
  async getReviewItems(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ReviewItemDto[]> {
    return await this.storyService.getReviewItems(id);
  }

  @Get(':id/quizzes')
  @ApiOkResponse({ type: [QuizDto] })
  async getQuizzes(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<QuizDto[]> {
    return await this.storyService.getQuizzes(id);
  }

  // ── 에피소드 진행 엔드포인트 ──

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: EpisodeProgressResponseDto })
  async startEpisode(
    @Param('id', ParseIntPipe) episodeId: number,
    @ReqUser('id') userId: number,
  ): Promise<EpisodeProgressResponseDto> {
    return this.episodeService.startEpisode(userId, episodeId);
  }

  @Patch(':id/scene-complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: EpisodeProgressResponseDto })
  async completeScene(
    @Param('id', ParseIntPipe) episodeId: number,
    @ReqUser('id') userId: number,
    @Body() dto: SceneCompleteDto,
  ): Promise<EpisodeProgressResponseDto> {
    return this.episodeService.completeScene(userId, episodeId, dto.sceneId);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: EpisodeProgressResponseDto })
  async completeEpisode(
    @Param('id', ParseIntPipe) episodeId: number,
    @ReqUser('id') userId: number,
  ): Promise<EpisodeProgressResponseDto> {
    return this.episodeService.completeEpisode(userId, episodeId);
  }
}
