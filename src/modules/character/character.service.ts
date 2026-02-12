import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterDetailDto, CharacterListItemDto } from './dto/character.dto';
import { CharacterScope } from '@/generated/prisma/client';

@Injectable()
export class CharacterService {
  constructor(private readonly prisma: PrismaService) {}

  async getCharacters(): Promise<CharacterListItemDto[]> {
    const characters = await this.prisma.character.findMany({
      where: { scope: CharacterScope.GLOBAL },
      select: {
        id: true,
        name: true,
        avatarImage: true,
        friends: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        friends: {
          _count: 'desc',
        },
      },
    });
    return characters.map((character) => ({
      id: character.id,
      name: character.name,
      avatarImage: character.avatarImage ?? '',
      followers: character.friends.length,
    }));
  }

  async getCharacter(
    characterId: number,
    userId: number | undefined
  ): Promise<CharacterDetailDto> {
    const character = await this.prisma.character.findUniqueOrThrow({
      where: { id: characterId },
      select: {
        id: true,
        name: true,
        avatarImage: true,
        mainImage: true,
        description: true,
        personality: true,
      },
    });
    let affinity = 0;
    if (userId) {
      const friend = await this.prisma.characterFriend.findFirst({
        where: { userId, characterId },
        select: { affinity: true },
      });
      affinity = friend?.affinity ?? 0;
    }
    return {
      id: character.id,
      name: character.name,
      avatarImage: character.avatarImage ?? '',
      mainImage: character.mainImage ?? '',
      description: character.description,
      personality: character.personality ?? '',
      affinity,
    };
  }
}
