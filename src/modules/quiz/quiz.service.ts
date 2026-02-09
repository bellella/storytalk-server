import { EpisodeStage, QuizSessionType } from '@/generated/prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { XpSourceType, XpTriggerType } from '@/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { StartQuizSessionDto } from './dto/start-quiz-session.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { QuizSessionResponseDto } from './dto/quiz-session-response.dto';
import { QuizAnswerResponseDto } from './dto/quiz-answer-response.dto';
import { DailyQuizResponseDto } from './dto/daily-quiz-response.dto';
import { SubmitDailyQuizDto } from './dto/submit-daily-quiz.dto';
import { QuizDto } from '../episode/dto/quiz.dto';
import { DailyQuizCompleteResponseDto } from './dto/daily-quiz-complete-response.dto';
import { QuizScoreDto } from './dto/quiz-score.dto';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private xpService: XpService
  ) {}

  async startSession(
    userId: number,
    dto: StartQuizSessionDto
  ): Promise<QuizSessionResponseDto> {
    if (dto.type === QuizSessionType.EPISODE && !dto.episodeId) {
      throw new BadRequestException(
        'EPISODE 타입일 때 episodeId는 필수입니다.'
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
    dto: SubmitQuizAnswerDto
  ): Promise<QuizAnswerResponseDto> {
    const answer = await this.prisma.userQuizAnswer.create({
      data: {
        userId,
        quizId: dto.quizId,
        quizSessionId: sessionId,
        isCorrect: dto.isCorrect ?? null,
        payload: dto.payload,
      },
    });

    return {
      id: answer.id,
      userId: answer.userId,
      quizId: answer.quizId,
      quizSessionId: sessionId,
      isCorrect: answer.isCorrect,
      payload: answer.payload as Record<string, any>,
      createdAt: answer.createdAt,
    };
  }

  async completeQuizSession(
    userId: number,
    sessionId: number
  ): Promise<QuizScoreDto> {
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

    return {
      totalCount,
      correctCount,
      score,
    };
  }

  async getDailyQuiz(userId: number): Promise<DailyQuizResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    // 오늘 날짜 범위 (KST 기준)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 오늘 DAILY_QUIZ 세션이 이미 있는지 확인
    let session = await this.prisma.userQuizSession.findFirst({
      where: {
        userId,
        type: QuizSessionType.DAILY_QUIZ,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        quizSessionItems: {
          include: { quiz: true },
          orderBy: { order: 'asc' },
        },
        answers: true,
      },
    });

    if (!session) {
      // 유저 레벨에 맞는 퀴즈 10개 랜덤 추출
      const quizzes = await this.prisma.quiz.findMany({
        where: {
          isActive: true,
          level: user.level,
        },
      });

      // 랜덤 셔플 후 10개 선택
      const shuffled = quizzes.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 10);

      if (selected.length === 0) {
        throw new NotFoundException('해당 레벨에 맞는 퀴즈가 없습니다.');
      }

      // 세션 생성 + QuizSessionItem 생성
      session = await this.prisma.userQuizSession.create({
        data: {
          userId,
          type: QuizSessionType.DAILY_QUIZ,
          quizSessionItems: {
            create: selected.map((quiz, index) => ({
              quizId: quiz.id,
              order: index + 1,
            })),
          },
        },
        include: {
          quizSessionItems: {
            include: { quiz: true },
            orderBy: { order: 'asc' },
          },
          answers: true,
        },
      });
    }

    const isCompleted = !!session.completedAt;

    // 이미 답한 quizId 목록
    const answeredQuizIds = new Set(session.answers.map((a) => a.quizId));
    console.log(session, 'answeredQuizIds');
    // 완료됐으면 전체 반환, 아니면 미답변 퀴즈만 반환
    const targetItems = isCompleted
      ? session.quizSessionItems
      : session.quizSessionItems.filter(
          (item) => !answeredQuizIds.has(item.quizId)
        );

    const quizzes: QuizDto[] = targetItems.map((item) => ({
      id: item.quiz.id,
      sourceType: item.quiz.sourceType,
      sourceId: item.quiz.sourceId,
      type: item.quiz.type,
      questionEnglish: item.quiz.questionEnglish,
      questionKorean: item.quiz.questionKorean ?? undefined,
      description: item.quiz.description ?? undefined,
      order: item.order ?? undefined,
      data: (item.quiz.data as Record<string, any>) ?? undefined,
      isActive: item.quiz.isActive,
    }));

    return {
      session: this.toSessionDto(session),
      quizzes,
      isCompleted,
    };
  }

  async completeDailyQuiz(
    userId: number,
    sessionId: number
  ): Promise<DailyQuizCompleteResponseDto> {
    const scoreResult = await this.completeQuizSession(userId, sessionId);
    const xpResult = await this.xpService.grantXp({
      userId,
      triggerType: XpTriggerType.DAILY_QUIZ_COMPLETE,
      sourceType: XpSourceType.DAILY_QUIZ_SESSION,
      sourceId: sessionId,
    });

    return {
      xp: {
        xpGranted: xpResult.xpGranted,
        totalXp: xpResult.totalXp,
        previousLevel: xpResult.previousLevel,
        currentLevel: xpResult.currentLevel,
        leveledUp: xpResult.leveledUp,
        nextLevel: xpResult.nextLevel,
        xpToNextLevel: xpResult.xpToNextLevel,
        requiredTotalXp: xpResult.requiredTotalXp,
      },
      result: scoreResult,
    };
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
