import {
  EpisodeStage,
  QuizSessionType,
  QuizSourceType,
  QuizType,
  XpSourceType,
  XpTriggerType,
} from '@/generated/prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getTodayRange } from '@/common/utils/date.util';
import {
  parseSentenceBuildData,
  parseSentenceClozeData,
} from '@/utils/quiz-helpers';
import { Quiz } from '@/generated/prisma/client';
import { QuizDto } from '../episode/dto/quiz.dto';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { DailyQuizCompleteResponseDto } from './dto/daily-quiz-complete-response.dto';
import { DailyQuizResponseDto } from './dto/daily-quiz-response.dto';
import { QuizAnswerResponseDto } from './dto/quiz-answer-response.dto';
import { QuizScoreDto } from './dto/quiz-score.dto';
import { QuizSessionResponseDto } from './dto/quiz-session-response.dto';
import { StartQuizSessionDto } from './dto/start-quiz-session.dto';
import { SubmitQuizAnswerDto } from './dto/submit-quiz-answer.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

export interface QuizSentenceInput {
  englishText: string;
  koreanText: string;
  description: string;
}

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private xpService: XpService
  ) {}

  async generateQuizzes(
    sentences: QuizSentenceInput[],
    sourceId: number,
    sourceType: QuizSourceType
  ): Promise<SuccessResponseDto> {
    const quizTypes = [
      QuizType.SENTENCE_BUILD,
      QuizType.SENTENCE_CLOZE_BUILD,
      QuizType.SPEAK_REPEAT,
    ];
    console.log(sentences);
    const quizzes = await Promise.all(
      sentences.map((src, i) => {
        const type = quizTypes[i % quizTypes.length];
        const data = this.buildQuizData(type, src.englishText, src.koreanText);

        return this.prisma.quiz.create({
          data: {
            type,
            sourceType,
            sourceId,
            questionEnglish: src.englishText,
            questionKorean: src.koreanText,
            description: src.description,
            order: i + 1,
            data,
          },
        });
      })
    );

    return {
      success: true,
      message: '퀴즈가 생성되었습니다.',
    };
  }
  /**
   * AI 없이 로컬에서 퀴즈 데이터 생성
   */
  private buildQuizData(
    type: QuizType,
    english: string,
    korean: string
  ): Record<string, any> {
    switch (type) {
      case QuizType.SENTENCE_BUILD:
        return this.buildSentenceBuild(english, korean);
      case QuizType.SENTENCE_CLOZE_BUILD:
        return this.buildSentenceCloze(english, korean);
      case QuizType.SPEAK_REPEAT:
        return this.buildSpeakRepeat(english);
      default:
        return this.buildSentenceBuild(english, korean);
    }
  }

  /**
   * SENTENCE_BUILD: 단어 카드를 정렬해서 문장을 완성
   */
  private buildSentenceBuild(
    english: string,
    korean: string
  ): Record<string, any> {
    // 문장 끝 구두점 추출
    const punctMatch = english.match(/([.!?]+)$/);
    const punctuation = punctMatch ? punctMatch[1] : '';
    const clean = english.replace(/[.!?]+$/, '').trim();

    const words = clean.split(/\s+/);
    const tokens = words.map((w, i) => ({ id: `t${i + 1}`, t: w }));
    const answerTokenIds = tokens.map((t) => t.id);

    // distractor 1~2개 추가
    const distractors = this.pickDistractors(words, 2);
    const distractorTokens = distractors.map((w, i) => ({
      id: `t${tokens.length + i + 1}`,
      t: w,
    }));

    const tokensAll = [...tokens, ...distractorTokens];

    return {
      promptKorean: korean,
      tokensAll,
      answerTokenIds,
      settings: punctuation
        ? { autoPunctuation: { append: punctuation } }
        : undefined,
    };
  }

  /**
   * SENTENCE_CLOZE_BUILD: 문장에서 핵심 단어 1~2개를 빈칸으로 만들어 채우기
   */
  private buildSentenceCloze(
    english: string,
    korean: string
  ): Record<string, any> {
    const words = english.split(/\s+/);

    // 빈칸으로 뺄 단어 선택: 관사/접속사/전치사 제외한 content word
    const skipWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'am',
      'are',
      'was',
      'were',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'and',
      'but',
      'or',
      'do',
      'does',
      'did',
      'not',
      'no',
      'my',
      'your',
      'his',
      'her',
    ]);

    const candidates = words
      .map((w, i) => ({ word: w, index: i }))
      .filter(
        (c) =>
          !skipWords.has(c.word.toLowerCase().replace(/[^a-z]/g, '')) &&
          c.word.replace(/[^a-zA-Z]/g, '').length >= 3
      );

    // 1~2개 선택
    const slotCount = Math.min(candidates.length, words.length <= 5 ? 1 : 2);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, slotCount);
    const slotIndices = new Set(selected.map((s) => s.index));

    // parts 구성
    const parts: { type: string; t?: string; slotId?: string }[] = [];
    const answerBySlot: Record<string, string> = {};
    const choices: { id: string; t: string }[] = [];
    let slotNum = 0;
    let choiceNum = 0;

    let textBuf = '';
    for (let i = 0; i < words.length; i++) {
      if (slotIndices.has(i)) {
        if (textBuf) {
          parts.push({ type: 'text', t: textBuf });
          textBuf = '';
        }
        slotNum++;
        const slotId = `s${slotNum}`;
        parts.push({ type: 'slot', slotId });

        // 정답 choice
        choiceNum++;
        const correctId = `c${choiceNum}`;
        choices.push({ id: correctId, t: words[i] });
        answerBySlot[slotId] = correctId;

        // distractor 1~2개
        const distractors = this.pickDistractors([words[i]], 2);
        for (const d of distractors) {
          choiceNum++;
          choices.push({ id: `c${choiceNum}`, t: d });
        }
      } else {
        textBuf += (textBuf ? ' ' : '') + words[i];
      }
    }
    if (textBuf) parts.push({ type: 'text', t: textBuf });

    return {
      promptKorean: korean,
      parts,
      choices: choices.sort(() => Math.random() - 0.5),
      answerBySlot,
    };
  }

  /**
   * SPEAK_REPEAT: 문장을 듣고 따라 말하기
   */
  private buildSpeakRepeat(english: string): Record<string, any> {
    const words = english.split(/\s+/);

    // content word 중 2~4개를 필수 발음 단어로 선택
    const skipWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'am',
      'are',
      'was',
      'were',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'and',
      'but',
      'or',
    ]);

    const contentWords = words.filter(
      (w) =>
        !skipWords.has(w.toLowerCase().replace(/[^a-z]/g, '')) &&
        w.replace(/[^a-zA-Z]/g, '').length >= 2
    );

    const count = Math.min(contentWords.length, 4);
    const shuffled = [...contentWords].sort(() => Math.random() - 0.5);
    const required = shuffled.slice(0, Math.max(count, 2)).map((w, i) => ({
      id: `r${i + 1}`,
      t: w.replace(/[^a-zA-Z']/g, '').toLowerCase(),
    }));

    return {
      tts: {
        text: english,
        locale: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        autoPlay: true,
      },
      check: { required },
    };
  }

  /** 간단한 distractor 단어 풀 */
  private pickDistractors(exclude: string[], count: number): string[] {
    const pool = [
      'always',
      'never',
      'often',
      'very',
      'really',
      'just',
      'about',
      'much',
      'many',
      'some',
      'every',
      'still',
      'only',
      'also',
      'even',
      'well',
      'back',
      'then',
      'here',
      'there',
      'now',
      'before',
      'after',
      'again',
      'around',
      'between',
      'under',
      'above',
      'without',
      'being',
      'going',
      'getting',
      'making',
      'having',
      'should',
      'would',
      'could',
      'might',
      'must',
      'than',
      'both',
      'each',
      'while',
      'where',
    ];
    const lower = new Set(exclude.map((w) => w.toLowerCase()));
    const available = pool.filter((w) => !lower.has(w));
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  async startSession(
    userId: number,
    dto: StartQuizSessionDto
  ): Promise<QuizSessionResponseDto> {
    const needsSourceId: QuizSessionType[] = [
      QuizSessionType.EPISODE,
      QuizSessionType.PLAY,
    ];
    if (needsSourceId.includes(dto.type) && !dto.sourceId) {
      throw new BadRequestException(
        `${needsSourceId.join(', ')} 타입일 때 sourceId는 필수입니다.`
      );
    }

    const session = await this.prisma.userQuizSession.create({
      data: {
        userId,
        type: dto.type,
        ...(dto.sourceId ? { sourceId: dto.sourceId } : {}),
      },
    });

    // EPISODE 타입이면 UserEpisode 상태를 QUIZ_IN_PROGRESS로 업데이트
    if (dto.type === QuizSessionType.EPISODE && dto.sourceId) {
      await this.prisma.userEpisode.updateMany({
        where: { userId, episodeId: dto.sourceId },
        data: { currentStage: EpisodeStage.QUIZ_IN_PROGRESS },
      });
    } else if (dto.type === QuizSessionType.PLAY && dto.sourceId) {
      await this.prisma.userPlayEpisode.updateMany({
        where: { userId, episodeId: dto.sourceId },
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
    const { start: todayStart, end: todayEnd } = getTodayRange();

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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('유저를 찾을 수 없습니다.');
      }
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
    let targetItems = session.quizSessionItems;
    if (!isCompleted) {
      // 이미 답한 quizId 목록
      const answeredQuizIds = new Set(session.answers.map((a) => a.quizId));
      // 완료됐으면 전체 반환, 아니면 미답변 퀴즈만 반환
      targetItems = session.quizSessionItems.filter(
        (item) => !answeredQuizIds.has(item.quizId)
      );
      console.log(session, answeredQuizIds, isCompleted);
    }

    const quizzes: QuizDto[] = targetItems.map((item) =>
      this.toQuizDto(item.quiz, item.order ?? undefined)
    );
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

  async getQuizzesBySource(
    sourceType: QuizSourceType,
    sourceId: number
  ): Promise<QuizDto[]> {
    const quizzes = await this.prisma.quiz.findMany({
      where: { sourceType, sourceId, isActive: true },
      orderBy: { order: 'asc' },
    });
    return quizzes.map((q) => this.toQuizDto(q));
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

  toQuizDto(quiz: Quiz, orderOverride?: number): QuizDto {
    return {
      id: quiz.id,
      sourceType: quiz.sourceType,
      sourceId: quiz.sourceId,
      type: quiz.type,
      questionEnglish: quiz.questionEnglish,
      questionKorean: quiz.questionKorean ?? undefined,
      description: quiz.description ?? undefined,
      order: orderOverride ?? quiz.order ?? undefined,
      data: this.parseQuizData(quiz),
      isActive: quiz.isActive,
    };
  }

  private parseQuizData(quiz: Quiz): QuizDto['data'] {
    const raw = quiz.data as Record<string, any> | undefined;
    if (!raw) return undefined;

    switch (quiz.type) {
      case QuizType.SENTENCE_BUILD:
        return parseSentenceBuildData(raw) ?? raw;
      case QuizType.SENTENCE_CLOZE_BUILD:
        return parseSentenceClozeData(raw) ?? raw;
      default:
        return raw;
    }
  }

  private toSessionDto(session: any): QuizSessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      type: session.type,
      sourceId: session.sourceId,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      totalCount: session.totalCount,
      correctCount: session.correctCount,
      score: session.score,
    };
  }
}
