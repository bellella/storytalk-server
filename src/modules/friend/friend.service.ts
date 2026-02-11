import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendListItemDto } from './dto/friend.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

@Injectable()
export class FriendService {
  constructor(private readonly prisma: PrismaService) {}

  async addFriend(
    userId: number,
    characterId: number
  ): Promise<SuccessResponseDto> {
    const friend = await this.prisma.characterFriend
      .create({
        data: { userId, characterId, affinity: 1 },
      })
      .catch((error) => {
        if (error.code === 'P2002') {
          return {
            success: false,
            message: 'Friend already exists',
          };
        }
        throw error;
      });
    return {
      success: true,
      message: 'Friend added successfully',
    };
  }

  async getFriends(userId: number): Promise<FriendListItemDto[]> {
    const friends = await this.findFriendsByUserId(userId);
    if (friends.length === 0) return [];

    const characterIds = friends.map((f) => f.characterId);
    const chatMap = await this.buildChatMap(userId, characterIds);

    const items: FriendListItemDto[] = friends.map((friend) => {
      const chat = chatMap.get(friend.characterId);
      return {
        characterId: friend.characterId,
        name: friend.character.name,
        avatarImage: friend.character.avatarImage,
        affinity: friend.affinity,
        chatId: chat?.id ?? null,
        lastMessageAt: chat?.lastMessageAt ?? null,
        lastMessagePreview: this.truncate(
          chat?.lastMessage?.content ?? null,
          60
        ),
        unreadCount: chat?.unreadCount ?? 0,
      };
    });

    return this.sortFriends(items);
  }

  private async findFriendsByUserId(userId: number) {
    return this.prisma.characterFriend.findMany({
      where: { userId },
      include: {
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

  private sortFriends(items: FriendListItemDto[]): FriendListItemDto[] {
    return items.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return b.affinity - a.affinity;
    });
  }

  private truncate(text: string | null, maxLength: number): string | null {
    if (!text) return null;
    return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
  }
}
