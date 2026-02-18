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
import { QuizService } from './quiz.service';
import { StartQuizSessionDto } from './dto/start-quiz-session.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { SubmitDailyQuizDto } from './dto/submit-daily-quiz.dto';
import { QuizSessionResponseDto } from './dto/quiz-session-response.dto';
import { QuizAnswerResponseDto } from './dto/quiz-answer-response.dto';
import { DailyQuizResponseDto } from './dto/daily-quiz-response.dto';
import { DailyQuizCompleteResponseDto } from './dto/daily-quiz-complete-response.dto';
import { QuizScoreDto } from './dto/quiz-score.dto';
import { XpService } from '../xp/xp.service';
import { QuizSourceType } from '@/generated/prisma/enums';
import { QuizDto } from '../episode/dto/quiz.dto';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly xpService: XpService
  ) {}

  @Post('sessions/start')
  @ApiOkResponse({ type: QuizSessionResponseDto })
  async startSession(
    @ReqUser('id') userId: number,
    @Body() dto: StartQuizSessionDto
  ): Promise<QuizSessionResponseDto> {
    return this.quizService.startSession(userId, dto);
  }

  @Post('sessions/:sessionId/answer')
  @ApiOkResponse({ type: QuizAnswerResponseDto })
  async submitAnswer(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SubmitQuizAnswerDto
  ): Promise<QuizAnswerResponseDto> {
    return this.quizService.submitAnswer(userId, sessionId, dto);
  }

  @Patch('sessions/:sessionId/complete')
  @ApiOkResponse({ type: QuizScoreDto })
  async completeSession(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<QuizScoreDto> {
    return this.quizService.completeQuizSession(userId, sessionId);
  }

  // ── 오늘의 퀴즈 ──

  @Get('sessions/daily/start')
  @ApiOkResponse({ type: DailyQuizResponseDto })
  async getDailyQuiz(
    @ReqUser('id') userId: number
  ): Promise<DailyQuizResponseDto> {
    return this.quizService.getDailyQuiz(userId);
  }

  @Post('sessions/:sessionId/daily/complete')
  @ApiOkResponse({ type: DailyQuizCompleteResponseDto })
  async completeDailyQuiz(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number
  ): Promise<DailyQuizCompleteResponseDto> {
    return this.quizService.completeDailyQuiz(userId, sessionId);
  }

  // ── 소스별 퀴즈 조회 ──

  @Get('episodes/:episodeId')
  @ApiOkResponse({ type: [QuizDto] })
  async getEpisodeQuizzes(
    @Param('episodeId', ParseIntPipe) episodeId: number
  ): Promise<QuizDto[]> {
    return this.quizService.getQuizzesBySource(
      QuizSourceType.EPISODE,
      episodeId
    );
  }

  @Get('plays/:playEpisodeId')
  @ApiOkResponse({ type: [QuizDto] })
  async getPlayQuizzes(
    @Param('playEpisodeId', ParseIntPipe) playEpisodeId: number
  ): Promise<QuizDto[]> {
    return this.quizService.getQuizzesBySource(
      QuizSourceType.PLAY,
      playEpisodeId
    );
  }
}
