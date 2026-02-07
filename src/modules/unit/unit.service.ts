import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublishStatus } from '@/generated/prisma/enums';
import { EpisodeStatus, UnitDetailDto } from './dto/unit.dto';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unit.findMany({
      include: {
        story: {
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
          },
        },
      },
      where: {
        status: PublishStatus.PUBLISHED,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(
    id: number,
    userId: number | undefined
  ): Promise<UnitDetailDto> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        story: {
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            episodes: {
              select: {
                id: true,
                title: true,
                koreanTitle: true,
                description: true,
                userEpisodes: {
                  select: { id: true, isCompleted: true },
                  where: userId != null ? { userId } : { userId: -1 },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    const { story } = unit;
    const episodesOrdered = story.episodes;

    const episodes = episodesOrdered.map((episode, index) => {
      const userEpisode = episode.userEpisodes[0];
      const isCompleted = userEpisode?.isCompleted === true;
      const isFirst = index === 0;
      const prevCompleted =
        index > 0 &&
        episodesOrdered[index - 1].userEpisodes[0]?.isCompleted === true;

      let status: EpisodeStatus;
      if (isCompleted) {
        status = EpisodeStatus.COMPLETED;
      } else if (userId == null) {
        status = isFirst ? EpisodeStatus.AVAILABLE : EpisodeStatus.LOCKED;
      } else {
        status =
          isFirst || prevCompleted
            ? EpisodeStatus.AVAILABLE
            : EpisodeStatus.LOCKED;
      }

      return {
        id: episode.id,
        title: episode.title,
        koreanTitle: episode.koreanTitle ?? '',
        status,
        description: episode.description ?? '',
        ...(userEpisode != null && { userEpisode }),
      };
    });

    return {
      id: story.id,
      title: story.title,
      description: story.description ?? '',
      difficulty: story.difficulty,
      episodes,
    };
  }
}
