import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DialogueDto } from '@/modules/story/dto/episode-detail.dto';

export enum AiTask {
  IELTS_KO_TO_EN_CORRECTION = 'IELTS_KO_TO_EN_CORRECTION',
  FREE_CHAT_REPLY = 'FREE_CHAT_REPLY',
  NEXT_DIALOGUE = 'NEXT_DIALOGUE',
}

export enum LanguageMode {
  KO_TO_EN = 'KO_TO_EN',
  EN_ONLY = 'EN_ONLY',
}

export class AiGenerateSourceDto {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  dialogueId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  userText?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  sourceLogId?: number;
}

export class AiGenerateDto {
  // @IsEnum(AiTask)
  // @ApiProperty({ enum: Object.values(AiTask) })
  // task: AiTask;

  @IsString()
  userText: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  targetDialogueId?: number;
}

export class AiGenerateResponseDto {
  @ApiProperty({ type: DialogueDto })
  @ApiPropertyOptional()
  nextDialogues?: DialogueDto;
}