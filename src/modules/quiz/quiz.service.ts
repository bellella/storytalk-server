import { EpisodeStage, QuizSessionType } from '@/generated/prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartQuizSessionDto } from './dto/start-quiz-session.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { QuizSessionResponseDto } from './dto/quiz-session-response.dto';
import { QuizAnswerResponseDto } from './dto/quiz-answer-response.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async startSession(
    userId: number,
    dto: StartQuizSessionDto,
  ): Promise<QuizSessionResponseDto> {
    if (dto.type === QuizSessionType.EPISODE && !dto.episodeId) {
      throw new BadRequestException(
        'EPISODE 타입일 때 episodeId는 필수입니다.',
      );
    }

    const session = await this.prisma.userQuizSession.create({
      data: {
        userId,
        type: dto.type,
        episodeId: dto.episodeId ?? null,
      },
    });

    // EPISODE 타입이면 UserEpisode 상태를 QUIZ_IN_PROGRESS로 업데이트
    if (dto.type === QuizSessionType.EPISODE && dto.episodeId) {
      await this.prisma.userEpisode.updateMany({
        where: { userId, episodeId: dto.episodeId },
        data: { currentStage: EpisodeStage.QUIZ_IN_PROGRESS },
      });
    }

    return this.toSessionDto(session);
  }

  async submitAnswer(
    userId: number,
    sessionId: number,
    dto: SubmitQuizAnswerDto,
  ): Promise<QuizAnswerResponseDto> {
    const session = await this.findSessionOrThrow(sessionId, userId);

    const answer = await this.prisma.userQuizAnswer.create({
      data: {
        userId,
        quizId: dto.quizId,
        quizSessionId: session.id,
        isCorrect: dto.isCorrect ?? null,
        payload: dto.payload,
      },
    });

    return {
      id: answer.id,
      userId: answer.userId,
      quizId: answer.quizId,
      quizSessionId: session.id,
      isCorrect: answer.isCorrect,
      payload: answer.payload as Record<string, any>,
      createdAt: answer.createdAt,
    };
  }

  async completeSession(
    userId: number,
    sessionId: number,
  ): Promise<QuizSessionResponseDto> {
    const session = await this.findSessionOrThrow(sessionId, userId);

    // 답변 집계
    const answers = await this.prisma.userQuizAnswer.findMany({
      where: { quizSessionId: session.id },
    });

    const totalCount = answers.length;
    const correctCount = answers.filter((a) => a.isCorrect === true).length;
    const score =
      totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const updated = await this.prisma.userQuizSession.update({
      where: { id: session.id },
      data: {
        completedAt: new Date(),
        totalCount,
        correctCount,
        score,
      },
    });

    // EPISODE 타입이면 UserEpisode 완료 처리
    if (session.type === QuizSessionType.EPISODE && session.episodeId) {
      await this.prisma.userEpisode.updateMany({
        where: { userId, episodeId: session.episodeId },
        data: {
          currentStage: EpisodeStage.QUIZ_COMPLETED,
          isCompleted: true,
          completedAt: new Date(),
        },
      });
    }

    return this.toSessionDto(updated);
  }

  private async findSessionOrThrow(sessionId: number, userId: number) {
    const session = await this.prisma.userQuizSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException('퀴즈 세션을 찾을 수 없습니다.');
    }
    return session;
  }

  private toSessionDto(session: any): QuizSessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      type: session.type,
      episodeId: session.episodeId,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      totalCount: session.totalCount,
      correctCount: session.correctCount,
      score: session.score,
    };
  }
}
