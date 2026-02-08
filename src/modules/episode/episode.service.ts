import { EpisodeStage } from '@/generated/prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EpisodeProgressResponseDto } from './dto/episode-progress-response.dto';

@Injectable()
export class EpisodeService {
  constructor(private prisma: PrismaService) {}

  async startEpisode(
    userId: number,
    episodeId: number,
  ): Promise<EpisodeProgressResponseDto> {
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

    return this.toResponseDto(userEpisode);
  }

  async completeScene(
    userId: number,
    episodeId: number,
    sceneId: number,
  ): Promise<EpisodeProgressResponseDto> {
    const userEpisode = await this.findUserEpisodeOrThrow(userId, episodeId);

    const updated = await this.prisma.userEpisode.update({
      where: { id: userEpisode.id },
      data: { lastSceneId: sceneId },
    });

    return this.toResponseDto(updated);
  }

  async completeEpisode(
    userId: number,
    episodeId: number,
  ): Promise<EpisodeProgressResponseDto> {
    const userEpisode = await this.findUserEpisodeOrThrow(userId, episodeId);

    const updated = await this.prisma.userEpisode.update({
      where: { id: userEpisode.id },
      data: { currentStage: EpisodeStage.STORY_COMPLETED },
    });

    return this.toResponseDto(updated);
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

  private toResponseDto(userEpisode: any): EpisodeProgressResponseDto {
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
}
