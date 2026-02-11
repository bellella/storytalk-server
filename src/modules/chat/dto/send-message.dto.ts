import { MessageType } from '@/generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SendMessageOptionType {
  NEED_TRANSLATION = 'NEED_TRANSLATION',
  NEED_GRAMMAR_CORRECTION = 'NEED_GRAMMAR_CORRECTION',
}

export class SendMessageDto {
  @IsEnum(MessageType)
  @ApiProperty({ enum: MessageType })
  type: MessageType = MessageType.TEXT;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsEnum(SendMessageOptionType, { each: true })
  @IsOptional()
  options?: SendMessageOptionType[];
}
