import { ReqUser } from '@/common/decorators/user.decorator';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  AiInputSlotDto,
  AiInputSlotResponseDto,
  AiSlotDto,
  AiSlotResponseDto,
  CompletePlayResponseDto,
  MyPlayEpisodeItemDto,
  PlayEpisodeDetailResponseDto,
  ReplayResponseDto,
  ResultResponseDto,
} from './dto/play.dto';
import { UpdatePlayDto } from './dto/update-play.dto';
import { PlayService } from './play.service';

class MyPlayEpisodesResponseDto implements CursorResponseDto<MyPlayEpisodeItemDto> {
  @ApiProperty({ type: [MyPlayEpisodeItemDto] })
  items: MyPlayEpisodeItemDto[];
}

@ApiTags('Episode Plays')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('play-episodes')
export class PlayController {
  constructor(private readonly playService: PlayService) {}

  /**
   * 1️⃣ 내 플레이 리스트
   * GET /me/play-episodes
   */
  @Get('/me')
  @ApiOkResponse({ type: MyPlayEpisodesResponseDto })
  getMyPlayEpisodes(
    @ReqUser('id') userId: number,
    @Query() query: CursorRequestDto
  ): Promise<MyPlayEpisodesResponseDto> {
    return this.playService.getMyPlayEpisodes(userId, query);
  }

  /**
   * 2️⃣ 플레이 상세 (플레이 화면 진입 / 이어하기)
   * GET /play-episodes/:playEpisodeId
   */
  @Get('/:playEpisodeId')
  @ApiOkResponse({ type: PlayEpisodeDetailResponseDto })
  getPlayEpisode(
    @ReqUser('id') userId: number,
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number
  ): Promise<PlayEpisodeDetailResponseDto> {
    return this.playService.getPlayEpisode(userId, playEpisodeId);
  }

  /**
   * 중간 저장 (lastSceneId, lastDialogueId, currentStage 등)
   * PATCH /play-episodes/:playEpisodeId/progress
   */
  @Patch('/:playEpisodeId/progress')
  @ApiOkResponse({ type: SuccessResponseDto })
  updateProgress(
    @ReqUser('id') userId: number,
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number,
    @Body() dto: UpdatePlayDto
  ): Promise<SuccessResponseDto> {
    return this.playService.updateProgress(userId, playEpisodeId, dto);
  }

  /**
   * 3️⃣ 플레이 중 user input → AI 생성 + segment 저장
   * POST /play-episodes/:playEpisodeId/input
   */
  @Post('/:playEpisodeId/ai-slot')
  submitAiSlot(
    @ReqUser('id') userId: number,
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number,
    @Body() dto: AiSlotDto
  ): Promise<AiSlotResponseDto> {
    return this.playService.handleAiSlot(userId, playEpisodeId, dto.dialogueId);
  }

  /**
   * 3️⃣ 플레이 중 user input → AI 생성 + segment 저장
   * POST /play-episodes/:playEpisodeId/input
   */
  @Post('/:playEpisodeId/ai-input-slot')
  @ApiOkResponse({ type: AiInputSlotResponseDto })
  submitAiInputSlot(
    @ReqUser('id') userId: number,
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number,
    @Body() dto: AiInputSlotDto
  ): Promise<AiInputSlotResponseDto> {
    return this.playService.handleAiInputSlot(userId, playEpisodeId, dto);
  }

  /**
   * 4️⃣ 플레이 종료 → 결과 생성 + 퀴즈 생성
   * POST /play-episodes/:playEpisodeId/complete
   */
  @Post('/:playEpisodeId/complete')
  @ApiOkResponse({ type: CompletePlayResponseDto })
  completePlayEpisode(
    @ReqUser('id') userId: number,
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number
  ): Promise<CompletePlayResponseDto> {
    return this.playService.completePlayEpisode(userId, playEpisodeId);
  }

  /**
   * 5️⃣ 리플레이 데이터
   * GET /play-episodes/:playEpisodeId/replay
   */
  // @Get('/:playEpisodeId/replay')
  // @ApiOkResponse({ type: ReplayResponseDto })
  // getReplayData(
  //   @ReqUser('id') userId: number,
  //   @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number
  // ): Promise<ReplayResponseDto> {
  //   return this.playService.getReplayData(userId, playEpisodeId);
  // }

  /**
   * 결과 조회
   * GET /play-episodes/:playEpisodeId/result
   */
  @Get('/:playEpisodeId/result')
  @ApiOkResponse({ type: ResultResponseDto })
  getResult(
    @ReqUser('id') userId: number,
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number
  ): Promise<ResultResponseDto> {
    return this.playService.getResult(userId, playEpisodeId);
  }
}
