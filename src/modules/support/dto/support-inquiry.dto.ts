import {
  SupportInquiryStatus,
  SupportInquiryType,
} from '@/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class SupportInquiryItemDto {
  id: number;

  @ApiProperty({ enum: SupportInquiryType, enumName: 'SupportInquiryType' })
  type: SupportInquiryType;

  subject: string;
  message: string;

  @ApiProperty({ enum: SupportInquiryStatus, enumName: 'SupportInquiryStatus' })
  status: SupportInquiryStatus;

  email?: string | null;

  appVersion?: string | null;

  os?: string | null;

  osVersion?: string | null;

  deviceModel?: string | null;

  resolvedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

export class SupportInquiryListDto {
  @ApiProperty({ type: [SupportInquiryItemDto] })
  items: SupportInquiryItemDto[];
}
