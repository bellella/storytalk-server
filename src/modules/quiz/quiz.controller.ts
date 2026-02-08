import {
  Body,
  Controller,
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
import { QuizSessionResponseDto } from './dto/quiz-session-response.dto';
import { QuizAnswerResponseDto } from './dto/quiz-answer-response.dto';

@Controller('quiz')
@ApiTags('quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('sessions/start')
  @ApiOkResponse({ type: QuizSessionResponseDto })
  async startSession(
    @ReqUser('id') userId: number,
    @Body() dto: StartQuizSessionDto,
  ): Promise<QuizSessionResponseDto> {
    return this.quizService.startSession(userId, dto);
  }

  @Post('sessions/:sessionId/answer')
  @ApiOkResponse({ type: QuizAnswerResponseDto })
  async submitAnswer(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SubmitQuizAnswerDto,
  ): Promise<QuizAnswerResponseDto> {
    return this.quizService.submitAnswer(userId, sessionId, dto);
  }

  @Patch('sessions/:sessionId/complete')
  @ApiOkResponse({ type: QuizSessionResponseDto })
  async completeSession(
    @ReqUser('id') userId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<QuizSessionResponseDto> {
    return this.quizService.completeSession(userId, sessionId);
  }
}
