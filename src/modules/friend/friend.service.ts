import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CharacterRelationStatus } from '@/generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { FriendChatItemDto, FriendListItemDto } from './dto/friend.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

@Injectable()
export class FriendService {
  constructor(private readonly prisma: PrismaService) {}

  async addFriend(
    userId: number,
    characterId: number
  ): Promise<SuccessResponseDto> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      select: { name: true, greetingMessage: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const friend = await tx.characterFriend.findUnique({
        where: {
          userId_characterId: {
            userId,
            characterId,
          },
          status: CharacterRelationStatus.INVITABLE,
        },
      });

      if (!friend) {
        throw new NotFoundException('해금된 캐릭터가 아닙니다.');
      }

      await tx.characterFriend.update({
        where: {
          userId_characterId: { userId, characterId },
        },
        data: { status: CharacterRelationStatus.FRIEND },
      });

      const chat = await tx.characterChat.upsert({
        where: { userId_characterId: { userId, characterId } },
        create: { userId, characterId },
        update: {},
      });

      const message = await tx.message.create({
        data: {
          chatId: chat.id,
          userId,
          characterId,
          isFromUser: false,
          content:
            character?.greetingMessage ??
            `안녕! 나는 ${character?.name ?? ''}야. 잘 부탁해!`,
        },
      });

      await tx.characterChat.update({
        where: { id: chat.id },
        data: {
          lastMessageId: message.id,
          lastMessageAt: message.createdAt,
          unreadCount: { increment: 1 },
        },
      });
    });

    return { success: true };
  }

  async inviteFriend(
    userId: number,
    characterId: number
  ): Promise<SuccessResponseDto> {
    const record = await this.prisma.characterFriend.findUnique({
      where: { userId_characterId: { userId, characterId } },
      select: { status: true },
    });

    if (!record) {
      throw new NotFoundException('해금된 캐릭터가 아닙니다.');
    }
    if (record.status === CharacterRelationStatus.FRIEND) {
      throw new BadRequestException('이미 친구입니다.');
    }

    await this.prisma.characterFriend.update({
      where: { userId_characterId: { userId, characterId } },
      data: { status: CharacterRelationStatus.FRIEND, affinity: 1 },
    });

    return { success: true };
  }

  async getFriends(userId: number): Promise<FriendListItemDto[]> {
    const friends = await this.findFriendsByUserId(userId);

    const items: FriendListItemDto[] = friends.map((friend) => ({
      characterId: friend.characterId,
      name: friend.character.name,
      avatarImage: friend.character.avatarImage,
      status: friend.status,
    }));

    // FRIEND 먼저, INVITABLE 뒤
    return items.sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === CharacterRelationStatus.FRIEND ? -1 : 1;
    });
  }

  async getFriendChats(userId: number): Promise<FriendChatItemDto[]> {
    const friends = await this.findFriendsByUserId(userId);
    if (friends.length === 0) return [];

    const characterIds = friends.map((f) => f.characterId);
    const chatMap = await this.buildChatMap(userId, characterIds);

    const items: FriendChatItemDto[] = [];
    for (const friend of friends) {
      const chat = chatMap.get(friend.characterId);
      if (!chat) continue;
      items.push({
        characterId: friend.characterId,
        name: friend.character.name,
        avatarImage: friend.character.avatarImage,
        chatId: chat.id,
        lastMessageAt: chat.lastMessageAt,
        lastMessagePreview: this.truncate(
          chat.lastMessage?.content ?? null,
          60
        ),
        unreadCount: chat.unreadCount,
      });
    }

    return items.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt)
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return 0;
    });
  }

  private async findFriendsByUserId(userId: number) {
    return this.prisma.characterFriend.findMany({
      where: { userId, status: { not: CharacterRelationStatus.LOCKED } },
      select: {
        characterId: true,
        status: true,
        affinity: true,
        character: {
          select: { id: true, name: true, avatarImage: true },
        },
      },
    });
  }

  private async buildChatMap(userId: number, characterIds: number[]) {
    const chats = await this.prisma.characterChat.findMany({
      where: { userId, characterId: { in: characterIds } },
      include: {
        lastMessage: {
          select: { content: true },
        },
      },
    });

    return new Map(chats.map((c) => [c.characterId, c]));
  }

  private truncate(text: string | null, maxLength: number): string | null {
    if (!text) return null;
    return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
  }

  // async getFriend(userId: number, characterId: number): Promise<FriendDetailDto> {
  //   const friend = await this.prisma.characterFriend.findFirst({
  //     select: { affinity: true },
  //     where: { userId, characterId },
  //   });
  //   return {
  //     characterId,
  //     affinity: friend.affinity,
  //   };
  // }
}
