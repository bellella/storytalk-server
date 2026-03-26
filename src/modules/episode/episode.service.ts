import { EpisodeStage, EpisodeType, UsageFeatureType } from '@/generated/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EpisodeProgressDto } from './dto/episode-progress-response.dto';
import { EpisodeLikeItemDto } from './dto/episode-like-item.dto';
import { EpisodeLikeToggleResponseDto } from './dto/episode-like-toggle-response.dto';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class EpisodeService {
  constructor(
    private prisma: PrismaService,
    private usageService: UsageService
  ) {}

  async startEpisode(
    userId: number,
    episodeId: number
  ): Promise<EpisodeProgressDto> {
    // 에피소드 존재 확인
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });
    if (!episode) {
      throw new NotFoundException('에피소드를 찾을 수 없습니다.');
    }

    // NOVEL 타입만 usage 체크 (처음 시작할 때만)
    if (episode.type === EpisodeType.NOVEL) {
      const existing = await this.prisma.userEpisode.findUnique({
        where: { userId_episodeId: { userId, episodeId } },
      });
      if (!existing) {
        await this.usageService.recordUsage(userId, UsageFeatureType.EPISODE_READ);
      }
    }

    // upsert: 이미 시작했으면 기존 데이터 반환, 없으면 새로 생성
    const userEpisode = await this.prisma.userEpisode.upsert({
      where: {
        userId_episodeId: { userId, episodeId },
      },
      create: {
        userId,
        episodeId,
        currentStage: EpisodeStage.STORY_IN_PROGRESS,
      },
      update: {},
    });

    return {
      id: userEpisode.id,
      userId: userEpisode.userId,
      episodeId: userEpisode.episodeId,
      startedAt: userEpisode.startedAt,
      completedAt: userEpisode.completedAt,
      lastSceneId: userEpisode.lastSceneId,
      currentStage: userEpisode.currentStage,
      score: userEpisode.score,
      isCompleted: userEpisode.isCompleted,
    };
  }

  async updateEpisodeProgress(
    userId: number,
    episodeId: number,
    sceneId: number
  ): Promise<SuccessResponseDto> {
    const userEpisode = await this.findUserEpisodeOrThrow(userId, episodeId);

    await this.prisma.userEpisode.update({
      where: { id: userEpisode.id },
      data: { lastSceneId: sceneId },
    });

    return { success: true };
  }

  async completeEpisode(
    userId: number,
    episodeId: number
  ): Promise<SuccessResponseDto> {
    const userEpisode = await this.findUserEpisodeOrThrow(userId, episodeId);

    await this.prisma.userEpisode.update({
      where: { id: userEpisode.id },
      data: { currentStage: EpisodeStage.STORY_COMPLETED, isCompleted: true },
    });

    return { success: true };
  }

  async toggleEpisodeLike(
    userId: number,
    episodeId: number
  ): Promise<EpisodeLikeToggleResponseDto> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true },
    });

    if (!episode) {
      throw new NotFoundException('에피소드를 찾을 수 없습니다.');
    }

    const existingLike = await this.prisma.userEpisodeLike.findUnique({
      where: {
        userId_episodeId: { userId, episodeId },
      },
    });

    if (existingLike) {
      await this.prisma.userEpisodeLike.delete({
        where: {
          userId_episodeId: { userId, episodeId },
        },
      });
      return { success: true, episodeId, isLiked: false };
    }

    await this.prisma.userEpisodeLike.create({
      data: {
        userId,
        episodeId,
      },
    });

    return { success: true, episodeId, isLiked: true };
  }

  async getUserEpisodeLikes(userId: number): Promise<EpisodeLikeItemDto[]> {
    const likes = await this.prisma.userEpisodeLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        episode: {
          select: {
            id: true,
            title: true,
            koreanTitle: true,
            order: true,
            type: true,
            thumbnailUrl: true,
            story: { select: { id: true, title: true, coverImage: true } },
            episodeProducts: {
              select: { productId: true },
              orderBy: { id: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    return likes.map((like) => ({
      id: like.episode.id,
      title: like.episode.title,
      koreanTitle: like.episode.koreanTitle,
      order: like.episode.order,
      // NOVEL: story image, PLAY: episode image
      thumbnailUrl:
        like.episode.type === 'NOVEL'
          ? like.episode.story?.coverImage ?? null
          : like.episode.thumbnailUrl ?? null,
      type: like.episode.type,
      storyId: like.episode.story?.id,
      storyTitle: like.episode.story?.title,
      productId: like.episode.episodeProducts?.[0]?.productId ?? null,
      isLiked: true,
    }));
  }

  async findUserEpisodeOrThrow(userId: number, episodeId: number) {
    const userEpisode = await this.prisma.userEpisode.findUnique({
      where: {
        userId_episodeId: { userId, episodeId },
      },
    });
    if (!userEpisode) {
      throw new NotFoundException('에피소드 진행 정보를 찾을 수 없습니다.');
    }
    return userEpisode;
  }
}
