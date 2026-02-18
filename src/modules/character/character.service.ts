import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterDetailDto, CharacterListItemDto } from './dto/character.dto';
import { CharacterScope } from '@/generated/prisma/client';

export interface CharacterImageEntry {
  id: number;
  characterId: number;
  imageUrl: string;
  label: string | null;
  isDefault: boolean;
}

/** characterId → label → imageUrl */
export type CharacterImageMap = Map<number, Map<string, string>>;

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

  /**
   * 캐릭터 ID 목록으로 이미지 맵 생성.
   * 반환: characterId → (label → imageUrl) 이중 Map
   */
  async buildImageMap(characterIds: number[]): Promise<CharacterImageMap> {
    if (!characterIds.length) return new Map();

    const images = await this.prisma.characterImage.findMany({
      where: { characterId: { in: characterIds } },
      select: {
        characterId: true,
        imageUrl: true,
        label: true,
        isDefault: true,
      },
    });

    const map: CharacterImageMap = new Map();
    for (const img of images) {
      let labelMap = map.get(img.characterId);
      if (!labelMap) {
        labelMap = new Map();
        map.set(img.characterId, labelMap);
      }
      const label = img.label ?? 'default';
      labelMap.set(label, img.imageUrl);
      if (img.isDefault) {
        labelMap.set('default', img.imageUrl);
      }
    }
    return map;
  }

  /**
   * characterId + label → imageUrl 단건 resolve
   */
  resolveImageUrl(
    imageMap: CharacterImageMap,
    characterId: number,
    label?: string | null
  ): string | undefined {
    const labelMap = imageMap.get(characterId);
    if (!labelMap) return undefined;
    return labelMap.get(label ?? 'default') ?? labelMap.get('default');
  }
}
