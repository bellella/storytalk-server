import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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

const FACETALK_PROMPT_KEY = 'FACETALK_PROMPT_KEY';

@Injectable()
export class FaceTalkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
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

    const session = await this.prisma.faceTalkSession.create({
      data: {
        chatId,
        userId,
        characterId: chat.characterId,
        status: FaceTalkStatus.STARTED,
      },
    });

    return {
      sessionId: session.id,
      chatId: session.chatId,
      status: session.status,
      startedAt: session.startedAt,
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
    if (session.userId !== userId) throw new ForbiddenException('Not your session');

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
      minutes > 0
        ? `${minutes}분 ${seconds}초`
        : `${seconds}초`;

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
    if (session.userId !== userId) throw new ForbiddenException('Not your session');

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
    if (session.userId !== userId) throw new ForbiddenException('Not your session');
    if (session.status !== FaceTalkStatus.STARTED) {
      throw new BadRequestException('Session is not active');
    }

    const character = await this.prisma.character.findUniqueOrThrow({
      where: { id: session.characterId },
      select: { aiPrompt: true, name: true },
    });

    const systemPrompt = await this.buildFaceTalkPrompt(
      character.aiPrompt ?? '',
      character.name
    );

    const rawText = await this.openAiService.callApi(systemPrompt, [
      { role: 'user', content: userInput },
    ]);

    const parsed = this.parseTurnResponse(rawText);

    await this.prisma.faceTalkSession.update({
      where: { id: sessionId },
      data: { totalTurns: { increment: 1 } },
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
    if (session.userId !== userId) throw new ForbiddenException('Not your session');
    if (session.status !== FaceTalkStatus.STARTED) {
      throw new BadRequestException('Session is already ended or cancelled');
    }
    return session;
  }

  private async buildFaceTalkPrompt(
    aiPrompt: string,
    characterName: string
  ): Promise<string> {
    const templatePrompt = await this.promptTemplateService.getPromptContentOrNull(
      FACETALK_PROMPT_KEY,
      { characterName, aiPrompt }
    );

    if (templatePrompt) return templatePrompt;

    return `You are ${characterName}. ${aiPrompt}
This is a face-to-face video call. Keep responses natural, conversational, and brief (1-3 sentences).

Respond ONLY with valid JSON:
{
  "content": "<your reply in English>",
  "translated": "<Korean translation in informal speech (반말)>"
}`;
  }

  private parseTurnResponse(raw: string): FaceTalkTurnResponseDto {
    try {
      const parsed = JSON.parse(raw);
      return {
        content: parsed.content ?? '',
        translated: parsed.translated ?? '',
      };
    } catch {
      return { content: raw, translated: '' };
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
