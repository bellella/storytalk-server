// src/story/story.service.ts
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import {
  EpisodeStage,
  PublishStatus,
  StoryType,
} from '@/generated/prisma/client';
import { CurrentUser } from '@/types/auth.type';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QuizDto } from '../episode/dto/quiz.dto';
import { QuizService } from '../quiz/quiz.service';
import { ReviewItemDto } from '../episode/dto/review-item.dto';
import { UserEpisodeDto } from '../episode/dto/user-episode.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CharacterImageDto,
  DialogueDto,
  EpisodeDetailDto,
  SceneDto,
} from './dto/episode-detail.dto';
import { StoryDetailDto } from './dto/story-detail.dto';
import { StoryListItemDto } from './dto/story-list-item.dto';
import { TagItemDto } from './dto/tag-item.dto';
import { CharacterService } from '../character/character.service';

@Injectable()
export class StoryService {
  constructor(
    private prisma: PrismaService,
    private quizService: QuizService,
    private characterService: CharacterService
  ) {}

  async getStoryDetail(
    storyId: number,
    user: CurrentUser | undefined
  ): Promise<StoryDetailDto> {
    // 1️⃣ 스토리 기본 조회 (에피소드, 캐릭터 포함)
    const story = await this.prisma.story.findUnique({
      where: { id: storyId, type: StoryType.NOVEL },
      include: {
        episodes: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            // duration 등 추가 필드 필요 시 여기서 select
          },
        },
        storyCharacters: {
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

    // 2️⃣ 유저가 로그인 되어 있다면 Episode 진행 상태 조회
    let userEpisodeMap: Record<number, UserEpisodeDto> = {};
    if (user) {
      const stageWeights = {
        [EpisodeStage.STORY_IN_PROGRESS]: 25,
        [EpisodeStage.STORY_COMPLETED]: 50,
        [EpisodeStage.QUIZ_IN_PROGRESS]: 75,
        [EpisodeStage.QUIZ_COMPLETED]: 100,
      };
      const userEpisodeResults = await this.prisma.userEpisode
        .findMany({
          select: {
            id: true,
            episodeId: true,
            currentStage: true,
          },
          where: {
            userId: user.id,
            episode: { storyId }, // Prisma에서 relation 조건 가능
          },
        })
        .catch((error) => {
          console.error(error);
          return [];
        });

      // episodeId 기준으로 맵핑
      userEpisodeMap = Object.fromEntries(
        userEpisodeResults.map((uer) => [
          uer.episodeId,
          {
            ...uer,
            progressPct: stageWeights[uer.currentStage] ?? 0,
          },
        ])
      );
    }

    // 3️⃣ 데이터 가공
    return {
      id: story.id,
      title: story.title,
      description: story.description ?? undefined,
      coverImage: story.coverImage ?? undefined,
      level: story.level,
      totalEpisodes: story.episodes.length,
      status: story.status === PublishStatus.PUBLISHED ? '연재중' : '준비중',
      likeCount: 123, // TODO: 실제 좋아요 카운트 로직으로 교체
      episodes: story.episodes.map((ep) => ({
        id: ep.id,
        title: ep.title,
        order: ep.order,
        duration: '5 min', // TODO: Episode 모델에 duration 필드 추가
        userEpisode: userEpisodeMap[ep.id] ?? null, // 유저 진행 상태 포함
      })),
      characters: story.storyCharacters.map((sc) => ({
        id: sc.character?.id!,
        name: sc.character?.name!,
        description: sc.character?.description!,
        avatarImage: sc.character?.avatarImage!,
      })),
    };
  }

  async getStories(
    cursorRequest: CursorRequestDto,
    tag?: string
  ): Promise<CursorResponseDto<StoryListItemDto>> {
    const { cursorString, limit } = cursorRequest;

    const stories = await this.prisma.story.findMany({
      where: {
        type: StoryType.NOVEL,
        ...(cursorString
          ? {
              id: {
                gt: parseInt(cursorString, 10),
              },
            }
          : {}),
        ...(tag
          ? {
              storyTags: {
                some: {
                  tag: {
                    slug: tag,
                  },
                },
              },
            }
          : {}),
      },
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
      level: story.level,
      status: story.status === PublishStatus.PUBLISHED ? '연재중' : '준비중',
      totalEpisodes: story._count.episodes,
      likeCount: 123, // TODO: DB에 likeCount 필드 추가 필요
    }));

    const nextCursor = hasNextPage
      ? items[items.length - 1].id.toString()
      : null;

    return new CursorResponseDto(storyListItems, null, nextCursor);
  }

  async getEpisodeDetail(episodeId: number): Promise<EpisodeDetailDto> {
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
            storyCharacters: {
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

    // 스토리에 등록된 캐릭터 ID 수집 → 이미지 맵 빌드
    const storyCharacterIds = (episode.story?.storyCharacters ?? [])
      .map((sc) => sc.character?.id)
      .filter((id): id is number => id != null);

    const imageMap =
      await this.characterService.buildImageMap(storyCharacterIds);

    // CharacterImageDto 평탄화 (응답용)
    const allCharacterImages: CharacterImageDto[] = (
      episode.story?.storyCharacters ?? []
    ).flatMap((sc) =>
      sc.character
        ? sc.character.images.map(
            (img): CharacterImageDto => ({
              id: img.id,
              characterId: img.characterId,
              imageUrl: img.imageUrl,
              label: img.label ?? undefined,
              isDefault: img.isDefault,
            })
          )
        : []
    );

    // Scenes와 Dialogues 매핑
    const scenes: SceneDto[] = episode.scenes.map((scene) => {
      const dialogues: DialogueDto[] = scene.dialogues.map((dialogue) => {
        let imageUrl = dialogue.imageUrl ?? undefined;

        if (dialogue.charImageLabel && dialogue.characterId) {
          const resolved = this.characterService.resolveImageUrl(
            imageMap,
            dialogue.characterId,
            dialogue.charImageLabel
          );
          if (resolved) imageUrl = resolved;
        }

        return {
          id: dialogue.id,
          order: dialogue.order,
          type: dialogue.type,
          characterId: dialogue.characterId ?? undefined,
          characterName:
            dialogue.character?.name ?? dialogue.characterName ?? undefined,
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
        type: scene.type,
        koreanTitle: scene.koreanTitle ?? undefined,
        order: scene.order,
        bgImageUrl: scene.bgImageUrl ?? undefined,
        audioUrl: scene.audioUrl ?? undefined,
        dialogues,
      };
    });

    return {
      id: episode.id,
      storyId: episode.storyId ?? undefined,
      title: episode.title,
      koreanTitle: episode.koreanTitle ?? undefined,
      order: episode.order,
      description: episode.description ?? undefined,
      koreanDescription: episode.koreanDescription ?? undefined,
      scenes,
      characterImages: allCharacterImages,
    };
  }

  async getReviewItems(episodeId: number): Promise<ReviewItemDto[]> {
    const reviewItems = await this.prisma.reviewItem.findMany({
      where: { episodeId },
      orderBy: { order: 'asc' },
    });

    // dialogueId들을 수집
    const dialogueIds = reviewItems.map((item) => item.dialogueId);

    // 모든 dialogue를 한 번에 조회 (character 포함)
    const dialogues = await this.prisma.dialogue.findMany({
      where: {
        id: {
          in: dialogueIds,
        },
      },
      include: {
        character: true,
      },
    });

    // dialogue를 Map으로 변환하여 빠른 조회
    const dialogueMap = new Map(
      dialogues.map((dialogue) => [dialogue.id, dialogue])
    );

    return reviewItems.map((item) => {
      const dialogue = dialogueMap.get(item.dialogueId);
      if (!dialogue) {
        throw new NotFoundException(
          `Dialogue with id ${item.dialogueId} not found`
        );
      }

      return {
        id: item.id,
        episodeId: item.episodeId,
        dialogueId: item.dialogueId,
        description: item.description ?? undefined,
        order: item.order,
        dialogue: {
          id: dialogue.id,
          order: dialogue.order,
          type: dialogue.type,
          characterName: dialogue.characterName ?? undefined,
          characterId: dialogue.characterId ?? undefined,
          englishText: dialogue.englishText,
          koreanText: dialogue.koreanText,
          charImageLabel: dialogue.charImageLabel ?? undefined,
          imageUrl: dialogue.imageUrl ?? undefined,
          audioUrl: dialogue.audioUrl ?? undefined,
          character: dialogue.character
            ? {
                id: dialogue.character.id,
                name: dialogue.character.name,
                koreanName: dialogue.character.koreanName ?? undefined,
                avatarImage: dialogue.character.avatarImage ?? undefined,
                mainImage: dialogue.character.mainImage ?? undefined,
                description: dialogue.character.description,
              }
            : undefined,
        },
      };
    });
  }

  async getQuizzes(episodeId: number): Promise<QuizDto[]> {
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        sourceType: 'EPISODE',
        sourceId: episodeId,
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return quizzes.map((quiz) => this.quizService.toQuizDto(quiz));
  }

  async getTags(): Promise<TagItemDto[]> {
    const tags = await this.prisma.tag.findMany();
    return tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      color: tag.color ?? undefined,
      icon: tag.icon ?? undefined,
    }));
  }
}
