import {
  EpisodeStage,
  XpSourceType,
  XpTriggerType,
} from '@/generated/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EpisodeProgressDto } from './dto/episode-progress-response.dto';
import { XpService } from '../xp/xp.service';
import { EpisodeCompleteResponseDto } from './dto/episode-complete-response.dto';

@Injectable()
export class EpisodeService {
  constructor(
    private prisma: PrismaService,
    private xpService: XpService
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
  ): Promise<EpisodeCompleteResponseDto> {
    const userEpisode = await this.findUserEpisodeOrThrow(userId, episodeId);
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        story: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
    if (!episode) {
      throw new NotFoundException('에피소드를 찾을 수 없습니다.');
    }

    const rewards = await this.prisma.episodeReward.findMany({
      where: { episodeId },
    });

    for (const reward of rewards) {
      // TODO: 보상 지급
    }

    await this.prisma.userEpisode.update({
      where: { id: userEpisode.id },
      data: { currentStage: EpisodeStage.STORY_COMPLETED, isCompleted: true },
    });

    const xpResult = await this.xpService.grantXp({
      userId,
      triggerType: XpTriggerType.EPISODE_COMPLETE,
      sourceType: XpSourceType.EPISODE,
      sourceId: episodeId,
    });

    return {
      xp: {
        xpGranted: xpResult.xpGranted,
        totalXp: xpResult.totalXp,
        previousLevel: xpResult.previousLevel,
        currentLevel: xpResult.currentLevel,
        leveledUp: xpResult.leveledUp,
        nextLevel: xpResult.nextLevel,
        xpToNextLevel: xpResult.xpToNextLevel,
        requiredTotalXp: xpResult.requiredTotalXp,
      },
      episode: {
        episodeId: episode.id,
        episodeTitle: episode.title,
        episodeOrder: episode.order,
        storyId: episode.story.id,
        storyTitle: episode.story.title,
      },
      rewards: rewards.map((r) => ({
        id: r.id,
        type: r.type,
        payload: r.payload as Record<string, any>,
      })),
    };
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
