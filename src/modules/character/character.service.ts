import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterDetailDto, CharacterListItemDto } from './dto/character.dto';
import { CharacterScope } from '@/generated/prisma/client';

@Injectable()
export class CharacterService {
  constructor(private readonly prisma: PrismaService) {}

  async getCharacters(userId: number): Promise<CharacterListItemDto[]> {
    const characters = await this.prisma.character.findMany({
      where: { scope: CharacterScope.GLOBAL },
      select: {
        id: true,
        name: true,
        avatarImage: true,
      },
    });
    return characters.map((character) => ({
      id: character.id,
      name: character.name,
      avatarImage: character.avatarImage ?? '',
    }));
  }

  async getCharacter(
    userId: number,
    characterId: number
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
    return {
      id: character.id,
      name: character.name,
      avatarImage: character.avatarImage ?? '',
      mainImage: character.mainImage ?? '',
      description: character.description,
      personality: character.personality ?? '',
    };
  }
}
