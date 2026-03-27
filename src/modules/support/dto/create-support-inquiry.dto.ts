import { SupportInquiryType } from '@/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSupportInquiryDto {
  @ApiPropertyOptional({
    enum: SupportInquiryType,
    enumName: 'SupportInquiryType',
    default: SupportInquiryType.GENERAL,
  })
  @IsEnum(SupportInquiryType)
  @IsOptional()
  type?: SupportInquiryType;

  @ApiProperty({ example: '결제가 되지 않아요' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: '상세 내용...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  message: string;

  @ApiPropertyOptional({ description: '회신 받을 이메일 (미입력 시 계정 이메일 사용)' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  os?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  osVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceModel?: string;
}
