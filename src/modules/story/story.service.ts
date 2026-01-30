// src/story/story.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoryDetailDto } from './dto/story-detail.dto';
import { StoryListItemDto } from './dto/story-list-item.dto';
import {
  EpisodeDetailDto,
  SceneDto,
  DialogueDto,
  CharacterImageDto,
} from './dto/episode-detail.dto';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';

@Injectable()
export class StoryService {
  constructor(private prisma: PrismaService) {}

  async getStoryDetail(storyId: string): Promise<StoryDetailDto> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        episodes: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            // 시안에 있는 '5분' 등의 정보는 Episode 모델에 추가 필드가 필요할 수 있습니다.
          },
        },
        characters: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                description: true,
                avatarImage: true,
              },
            },
          },
        },
      },
    });

    if (!story) throw new NotFoundException('스토리를 찾을 수 없습니다.');

    // 시안에 맞춰 데이터 가공
    return {
      ...story,
      description: story.description ?? undefined,
      coverImage: story.coverImage ?? undefined,
      totalEpisodes: story.episodes.length,
      status: story.isPublished ? '연재중' : '준비중',
      episodes: story.episodes.map((episode) => ({
        ...episode,
        duration: '5 min', // TODO: Episode 모델에 duration 필드 추가 필요
      })),
      characters: story.characters.map((sc) => ({
        id: sc.character?.id!,
        name: sc.character?.name!,
        description: sc.character?.description ?? undefined,
        avatarImage: sc.character?.avatarImage ?? undefined,
      })),
      likeCount: 123,
    };
  }

  async getStories(
    cursorRequest: CursorRequestDto
  ): Promise<CursorResponseDto<StoryListItemDto>> {
    const { cursorString, limit } = cursorRequest;

    const stories = await this.prisma.story.findMany({
      where: cursorString
        ? {
            id: {
              gt: cursorString,
            },
          }
        : undefined,
      take: limit + 1, // 한 개 더 가져와서 다음 페이지 여부 확인
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    });

    const hasNextPage = stories.length > limit;
    const items = hasNextPage ? stories.slice(0, limit) : stories;

    const storyListItems: StoryListItemDto[] = items.map((story) => ({
      id: story.id,
      title: story.title,
      description: story.description ?? undefined,
      coverImage: story.coverImage ?? undefined,
      category: story.category,
      difficulty: story.difficulty,
      status: story.isPublished ? '연재중' : '준비중',
      totalEpisodes: story._count.episodes,
      likeCount: 123, // TODO: DB에 likeCount 필드 추가 필요
    }));

    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return new CursorResponseDto(storyListItems, null, nextCursor);
  }

  async getEpisodeDetail(episodeId: string): Promise<EpisodeDetailDto> {
    // Episode와 관련된 모든 데이터 가져오기
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        scenes: {
          orderBy: { order: 'asc' },
          include: {
            dialogues: {
              orderBy: { order: 'asc' },
              include: {
                character: true,
              },
            },
          },
        },
        story: {
          include: {
            characters: {
              include: {
                character: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundException('에피소드를 찾을 수 없습니다.');
    }

    // StoryCharacter에 걸려있는 모든 CharacterImage 수집
    const characterImagesMap = new Map<string, CharacterImageDto[]>();
    episode.story.characters.forEach((storyChar) => {
      if (storyChar.character) {
        const images = storyChar.character.images.map(
          (img): CharacterImageDto => ({
            id: img.id,
            characterId: img.characterId,
            imageUrl: img.imageUrl,
            label: img.label ?? undefined,
            isDefault: img.isDefault,
          })
        );
        characterImagesMap.set(storyChar.character.id, images);
      }
    });

    // 모든 CharacterImage를 평탄화
    const allCharacterImages: CharacterImageDto[] = Array.from(
      characterImagesMap.values()
    ).flat();

    // Scenes와 Dialogues 매핑 (charImageLabel로 CharacterImage 매칭)
    const scenes: SceneDto[] = episode.scenes.map((scene) => {
      const dialogues: DialogueDto[] = scene.dialogues.map((dialogue) => {
        let imageUrl = dialogue.imageUrl ?? undefined;

        // charImageLabel이 있고 characterId가 있으면 CharacterImage에서 매핑
        if (dialogue.charImageLabel && dialogue.characterId) {
          const characterImages = characterImagesMap.get(dialogue.characterId);
          if (characterImages) {
            const matchedImage = characterImages.find(
              (img) => img.label === dialogue.charImageLabel
            );
            if (matchedImage) {
              imageUrl = matchedImage.imageUrl;
            }
          }
        }

        return {
          id: dialogue.id,
          order: dialogue.order,
          type: dialogue.type,
          characterId: dialogue.characterId ?? undefined,
          characterName: dialogue.characterName ?? undefined,
          englishText: dialogue.englishText,
          koreanText: dialogue.koreanText,
          charImageLabel: dialogue.charImageLabel ?? undefined,
          imageUrl,
          audioUrl: dialogue.audioUrl ?? undefined,
        };
      });

      return {
        id: scene.id,
        title: scene.title,
        koreanTitle: scene.koreanTitle ?? undefined,
        order: scene.order,
        bgImageUrl: scene.bgImageUrl ?? undefined,
        audioUrl: scene.audioUrl ?? undefined,
        dialogues,
      };
    });

    return {
      id: episode.id,
      storyId: episode.storyId,
      title: episode.title,
      koreanTitle: episode.KoreanTitle ?? undefined,
      order: episode.order,
      description: episode.description ?? undefined,
      koreanDescription: episode.koreanDescription ?? undefined,
      scenes,
      characterImages: allCharacterImages,
    };
  }
}
