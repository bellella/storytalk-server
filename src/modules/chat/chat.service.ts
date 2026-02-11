import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from '../ai/openai.service';
import { ChatGateway } from './chat.gateway';
import { ChatRoomListItemDto } from './dto/chat-room-list-item.dto';
import { ChatMessageDto, MessagePayloadDto } from './dto/chat-message.dto';
import { SendMessageResponseDto } from './dto/send-message-response.dto';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { MessageType } from '@/generated/prisma/client';
import { SendMessageDto, SendMessageOptionType } from './dto/send-message.dto';
import { SaveMessageData } from '@/types/ai.type';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway
  ) {}

  // ────────────────────────────────────────────
  // Read
  // ────────────────────────────────────────────

  async getChatRooms(userId: number): Promise<ChatRoomListItemDto[]> {
    const chats = await this.prisma.characterChat.findMany({
      where: { userId },
      include: {
        character: {
          select: { id: true, name: true, avatarImage: true },
        },
        lastMessage: {
          select: {
            id: true,
            type: true,
            content: true,
            isFromUser: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { lastMessageAt: 'desc' }],
    });

    return chats.map((chat) => ({
      chatId: chat.id,
      character: chat.character,
      lastMessage: chat.lastMessage
        ? {
            id: chat.lastMessage.id,
            type: chat.lastMessage.type,
            content: this.truncate(chat.lastMessage.content, 60),
            isFromUser: chat.lastMessage.isFromUser,
            createdAt: chat.lastMessage.createdAt,
          }
        : null,
      unreadCount: chat.unreadCount,
      isPinned: chat.isPinned,
      lastMessageAt: chat.lastMessageAt,
    }));
  }

  async getMessages(
    chatId: number,
    userId: number,
    query: CursorRequestDto
  ): Promise<CursorResponseDto<ChatMessageDto>> {
    await this.verifyChatOwnership(chatId, userId);

    const take = query.limit + 1;
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        content: true,
        payload: true,
        isFromUser: true,
        createdAt: true,
      },
    });

    const hasNext = messages.length > query.limit;
    const items = hasNext ? messages.slice(0, query.limit) : messages;
    const nextCursor = hasNext ? items[items.length - 1].id : null;

    return new CursorResponseDto(
      items.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        payload: m.payload as unknown as MessagePayloadDto,
        isFromUser: m.isFromUser,
        createdAt: m.createdAt,
      })),
      nextCursor
    );
  }

  // ────────────────────────────────────────────
  // Write
  // ────────────────────────────────────────────

  async sendMessage(
    userId: number,
    characterId: number,
    dto: SendMessageDto
  ): Promise<SendMessageResponseDto> {
    const chat = await this.getOrCreateChat(userId, characterId);

    // 1) 유저 메시지 저장
    const userMsg = await this.saveMessage({
      chatId: chat.id,
      userId,
      characterId,
      isFromUser: true,
      type: dto.type,
      content: dto.content,
      options: dto.options,
    });
    await this.updateChatAfterMessage(chat.id, userMsg.id, false);

    // 2) AI 응답 생성
    const recentMessages = await this.getRecentMessages(chat.id);
    const { aiPrompt } = await this.prisma.character.findUniqueOrThrow({
      where: { id: characterId },
      select: {
        aiPrompt: true,
      },
    });

    const affinity = await this.getAffinity(userId, characterId);

    // AI 응답 생성
    const aiResponse = await this.openAiService.generateCharacterResponse({
      type: dto.type,
      userId,
      aiPrompt: aiPrompt || '',
      affinity,
      recentMessages: recentMessages.map((m) => ({
        isFromUser: m.isFromUser,
        content: m.content,
      })),
      userMessage: dto.content,
      options: dto.options,
    });
    console.log(aiResponse, '조드새끼가 한거 ');
    const messages = aiResponse.messages.map((m) => ({
      chatId: chat.id,
      userId,
      characterId,
      isFromUser: false,
      type: m.type as MessageType,
      content: m.content,
      payload: {
        translated: m.translated,
      },
    }));
    console.log(messages, '저장할 메시지');
    const aiMsgs = await this.saveMessages(messages);
    // payload 에서 original, corrected, translated 를 추출하여 저장
    if (aiResponse.payload) {
      await this.prisma.message.update({
        where: { id: userMsg.id },
        data: {
          payload: {
            translated: aiResponse.payload.translated,
            corrected: aiResponse.payload.corrected,
          },
        },
      });
    }
    // 채팅방 업데이트
    await this.updateChatAfterMessage(
      chat.id,
      aiMsgs[aiMsgs.length - 1].id,
      true
    );

    // 4) 친구 관계 upsert
    //await this.upsertFriend(userId, characterId);

    const aiMessages = aiMsgs.map((m) => this.toMessageDto(m));
    // 5) WebSocket으로 AI 메시지 전송
    this.chatGateway.emitNewMessages(userId, aiMessages);

    return {
      userMessage: this.toMessageDto(userMsg),
      aiMessages,
    };
  }

  async markAsRead(chatId: number, userId: number): Promise<void> {
    const chat = await this.verifyChatOwnership(chatId, userId);

    await this.prisma.characterChat.update({
      where: { id: chatId },
      data: {
        unreadCount: 0,
        lastReadMessageId: chat.lastMessageId,
        lastReadAt: new Date(),
      },
    });

    this.chatGateway.emitReadReceipt(userId, chatId);
  }

  // ────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────

  async verifyChatOwnership(chatId: number, userId: number) {
    const chat = await this.prisma.characterChat.findUnique({
      where: { id: chatId },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.userId !== userId) throw new ForbiddenException('Not your chat');
    return chat;
  }

  private async getOrCreateChat(userId: number, characterId: number) {
    return this.prisma.characterChat.upsert({
      where: { userId_characterId: { userId, characterId } },
      create: { userId, characterId },
      update: {},
    });
  }

  private async saveMessage(data: SaveMessageData) {
    const {
      chatId,
      userId,
      characterId,
      isFromUser,
      type,
      content,
      options,
      payload,
    } = data;
    const combinedPayload = {
      ...(options ? { options } : {}),
      ...(payload ? { payload } : {}),
    };
    return this.prisma.message.create({
      data: {
        chatId,
        userId,
        characterId,
        isFromUser,
        type,
        content,
        payload: combinedPayload,
      },
    });
  }

  private async saveMessages(data: SaveMessageData[]) {
    return this.prisma.message.createManyAndReturn({
      data,
    });
  }

  private async getRecentMessages(chatId: number, limit = 20) {
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { isFromUser: true, content: true },
    });
    return messages.reverse();
  }

  private async updateChatAfterMessage(
    chatId: number,
    messageId: number,
    incrementUnread: boolean
  ) {
    await this.prisma.characterChat.update({
      where: { id: chatId },
      data: {
        lastMessageId: messageId,
        lastMessageAt: new Date(),
        ...(incrementUnread ? { unreadCount: { increment: 1 } } : {}),
      },
    });
  }

  private async upsertFriend(userId: number, characterId: number) {
    await this.prisma.characterFriend.upsert({
      where: { userId_characterId: { userId, characterId } },
      create: { userId, characterId, affinity: 1 },
      update: {},
    });
  }

  private async getAffinity(
    userId: number,
    characterId: number
  ): Promise<number> {
    const friend = await this.prisma.characterFriend.findUnique({
      where: { userId_characterId: { userId, characterId } },
      select: { affinity: true },
    });
    return friend?.affinity ?? 0;
  }

  private toMessageDto(msg: {
    id: number;
    type: MessageType;
    content: string;
    payload?: any;
    isFromUser: boolean;
    createdAt: Date;
  }): ChatMessageDto {
    return {
      id: msg.id,
      type: msg.type,
      content: msg.content,
      payload: msg.payload ?? null,
      isFromUser: msg.isFromUser,
      createdAt: msg.createdAt,
    };
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
  }
}
