import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { OpenAiService } from '@/modules/ai/openai.service';
import { PromptTemplateService } from '@/modules/prompt-template/prompt-template.service';
import { FaceTalkStatus, MessageType } from '@/generated/prisma/client';
import {
  FaceTalkSessionDto,
  FaceTalkTurnResponseDto,
  StartFaceTalkResponseDto,
} from './dto/facetalk.dto';
import { buildFaceTalkPrompt } from './ai/facetalk.prompt';
import { ChatService } from '../chat/chat.service';

const FACETALK_PROMPT_KEY = 'FACETALK_PROMPT';

@Injectable()
export class FaceTalkService {
  private readonly logger = new Logger(FaceTalkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    private readonly chatService: ChatService,
    private readonly promptTemplateService: PromptTemplateService
  ) {}

  // ────────────────────────────────────────────
  // Session lifecycle
  // ────────────────────────────────────────────

  async startSession(
    chatId: number,
    userId: number
  ): Promise<StartFaceTalkResponseDto> {
    const chat = await this.prisma.characterChat.findUnique({
      where: { id: chatId },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.userId !== userId) throw new ForbiddenException('Not your chat');

    const [session, characterImages] = await Promise.all([
      this.prisma.faceTalkSession.create({
        data: {
          chatId,
          userId,
          characterId: chat.characterId,
          status: FaceTalkStatus.STARTED,
        },
      }),
      this.prisma.characterImage.findMany({
        where: { characterId: chat.characterId },
        select: {
          id: true,
          characterId: true,
          imageUrl: true,
          label: true,
          isDefault: true,
        },
      }),
    ]);

    return {
      sessionId: session.id,
      chatId: session.chatId,
      status: session.status,
      startedAt: session.startedAt,
      characterImages,
    };
  }

  async getSession(
    sessionId: number,
    userId: number
  ): Promise<FaceTalkSessionDto> {
    const session = await this.prisma.faceTalkSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId)
      throw new ForbiddenException('Not your session');

    return this.toSessionDto(session);
  }

  async endSession(
    sessionId: number,
    userId: number
  ): Promise<FaceTalkSessionDto> {
    const session = await this.findActiveSession(sessionId, userId);

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    const updated = await this.prisma.faceTalkSession.update({
      where: { id: sessionId },
      data: { status: FaceTalkStatus.ENDED, endedAt, durationSeconds },
    });

    // 채팅방에 FACETALK 메시지 생성
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationText =
      minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;

    await this.prisma.message.create({
      data: {
        chatId: session.chatId,
        userId,
        characterId: session.characterId,
        isFromUser: false,
        type: MessageType.FACETALK,
        content: `페이스톡 ${durationText}`,
      },
    });

    return this.toSessionDto(updated);
  }

  async disconnectSession(
    sessionId: number,
    userId: number
  ): Promise<FaceTalkSessionDto> {
    const session = await this.findActiveSession(sessionId, userId);

    const updated = await this.prisma.faceTalkSession.update({
      where: { id: sessionId },
      data: { status: FaceTalkStatus.CANCELLED },
    });

    return this.toSessionDto(updated);
  }

  async missedSession(
    sessionId: number,
    userId: number
  ): Promise<FaceTalkSessionDto> {
    const session = await this.prisma.faceTalkSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId)
      throw new ForbiddenException('Not your session');

    const updated = await this.prisma.faceTalkSession.update({
      where: { id: sessionId },
      data: { status: FaceTalkStatus.MISSED },
    });

    await this.prisma.message.create({
      data: {
        chatId: session.chatId,
        userId,
        characterId: session.characterId,
        isFromUser: false,
        type: MessageType.FACETALK,
        content: '부재중 페이스톡',
      },
    });

    return this.toSessionDto(updated);
  }

  // ────────────────────────────────────────────
  // Turn processing
  // ────────────────────────────────────────────

  async processTurn(
    sessionId: number,
    userId: number,
    userInput: string
  ): Promise<FaceTalkTurnResponseDto> {
    const session = await this.prisma.faceTalkSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId)
      throw new ForbiddenException('Not your session');
    if (session.status !== FaceTalkStatus.STARTED) {
      throw new BadRequestException('Session is not active');
    }

    const [affinity, character, chat] = await Promise.all([
      this.chatService.getAffinity(userId, session.characterId),
      this.prisma.character.findUniqueOrThrow({
        where: { id: session.characterId },
        select: { chatPrompt: true, name: true },
      }),
      this.prisma.characterChat.findUnique({
        where: { id: session.chatId },
        select: { summary: true },
      }),
    ]);

    const systemPrompt = await this.buildFaceTalkPrompt(
      character.chatPrompt ?? '',
      character.name,
      affinity,
      chat?.summary
    );

    type SessionMessage = { role: 'user' | 'assistant'; content: string };
    const sessionHistory: SessionMessage[] = Array.isArray(
      session.sessionMessages
    )
      ? (session.sessionMessages as SessionMessage[])
      : [];

    this.logger.log(
      `processTurn sessionId=${sessionId} historyCount=${sessionHistory.length}`
    );

    const rawText = await this.openAiService.callApi(systemPrompt, [
      ...sessionHistory,
      { role: 'user', content: userInput },
    ]);

    this.logger.log(`processTurn sessionId=${sessionId} rawText=${rawText}`);

    const parsed = this.parseTurnResponse(rawText);

    await this.prisma.faceTalkSession.update({
      where: { id: sessionId },
      data: {
        sessionMessages: [
          ...sessionHistory,
          { role: 'user', content: userInput },
          { role: 'assistant', content: parsed.content },
        ],
        totalTurns: { increment: 1 },
      },
    });

    return parsed;
  }

  // ────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────

  private async findActiveSession(sessionId: number, userId: number) {
    const session = await this.prisma.faceTalkSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId)
      throw new ForbiddenException('Not your session');
    if (session.status !== FaceTalkStatus.STARTED) {
      throw new BadRequestException('Session is already ended or cancelled');
    }
    return session;
  }

  private async buildFaceTalkPrompt(
    chatPrompt: string,
    characterName: string,
    affinity: number,
    summary?: string | null
  ): Promise<string> {
    const templatePrompt =
      await this.promptTemplateService.getPromptContentOrNull(
        FACETALK_PROMPT_KEY,
        { characterName, chatPrompt, affinity, summary: summary ?? '' }
      );

    if (templatePrompt) return templatePrompt;

    return buildFaceTalkPrompt({
      characterName,
      chatPrompt,
      affinity,
      summary,
    });
  }

  private parseTurnResponse(raw: string): FaceTalkTurnResponseDto {
    try {
      const parsed = JSON.parse(raw);
      return {
        content: parsed.content ?? '',
        translated: parsed.translated ?? '',
        charImageLabel: parsed.charImageLabel ?? 'default',
      };
    } catch {
      return { content: raw, translated: '', charImageLabel: 'default' };
    }
  }

  private toSessionDto(session: {
    id: number;
    chatId: number;
    characterId: number;
    status: FaceTalkStatus;
    startedAt: Date;
    connectedAt: Date | null;
    endedAt: Date | null;
    durationSeconds: number | null;
    totalTurns: number;
  }): FaceTalkSessionDto {
    return {
      sessionId: session.id,
      chatId: session.chatId,
      characterId: session.characterId,
      status: session.status,
      startedAt: session.startedAt,
      connectedAt: session.connectedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      totalTurns: session.totalTurns,
    };
  }
}
