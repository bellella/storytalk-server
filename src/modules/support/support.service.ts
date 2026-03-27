import { PrismaService } from '@/modules/prisma/prisma.service';
import { SupportInquiryType } from '@/generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import { CreateSupportInquiryDto } from './dto/create-support-inquiry.dto';
import {
  SupportInquiryItemDto,
  SupportInquiryListDto,
} from './dto/support-inquiry.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createInquiry(
    userId: number,
    dto: CreateSupportInquiryDto
  ): Promise<SupportInquiryItemDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    const row = await this.prisma.supportInquiry.create({
      data: {
        userId,
        type: dto.type ?? SupportInquiryType.GENERAL,
        subject: dto.subject,
        message: dto.message,
        email: dto.email ?? user.email,
        appVersion: dto.appVersion,
        os: dto.os,
        osVersion: dto.osVersion,
        deviceModel: dto.deviceModel,
      },
    });

    return this.toItemDto(row);
  }

  async listMyInquiries(userId: number): Promise<SupportInquiryListDto> {
    const rows = await this.prisma.supportInquiry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { items: rows.map((r) => this.toItemDto(r)) };
  }

  private toItemDto(row: {
    id: number;
    type: SupportInquiryItemDto['type'];
    subject: string;
    message: string;
    status: SupportInquiryItemDto['status'];
    email: string | null;
    appVersion: string | null;
    os: string | null;
    osVersion: string | null;
    deviceModel: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): SupportInquiryItemDto {
    return {
      id: row.id,
      type: row.type,
      subject: row.subject,
      message: row.message,
      status: row.status,
      email: row.email,
      appVersion: row.appVersion,
      os: row.os,
      osVersion: row.osVersion,
      deviceModel: row.deviceModel,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
