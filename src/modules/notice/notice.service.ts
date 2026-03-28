import { PrismaService } from '@/modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import type { Notice, Prisma } from '@/generated/prisma/client';
import { NoticeItemDto } from './dto/notice.dto';

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 게시 중인 공지: 활성 + 노출 기간(startsAt/endsAt) 만족 */
  private activeNoticeWhere(now: Date): Prisma.NoticeWhereInput {
    return {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    };
  }

  private toItemDto(row: Notice): NoticeItemDto {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      isPopup: row.isPopup,
      version: row.version,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listNotices(
    query: CursorRequestDto
  ): Promise<CursorResponseDto<NoticeItemDto>> {
    const now = new Date();
    const { cursor, limit } = query;
    const where = this.activeNoticeWhere(now);

    const rows = await this.prisma.notice.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext ? (items[items.length - 1]?.id ?? null) : null;

    return new CursorResponseDto(
      items.map((r) => this.toItemDto(r)),
      nextCursor
    );
  }

  /** 앱 시작 팝업: 팝업 지정 + 게시 조건 만족하는 것 중 최신 1건 */
  async getLatestPopupNotice(): Promise<NoticeItemDto | null> {
    const now = new Date();
    const row = await this.prisma.notice.findFirst({
      where: {
        ...this.activeNoticeWhere(now),
        isPopup: true,
      },
      orderBy: { id: 'desc' },
    });

    return row ? this.toItemDto(row) : null;
  }
}
