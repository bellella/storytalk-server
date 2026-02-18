import { ApiPropertyOptional } from '@nestjs/swagger';
import { EpisodeStage } from '@/generated/prisma/enums';
import { IsEnum, IsInt, IsObject, IsOptional } from 'class-validator';

export class UpdatePlayDto {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  lastSceneId?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  lastDialogueId?: number;

  @IsOptional()
  @IsEnum(EpisodeStage)
  @ApiPropertyOptional({ enum: Object.values(EpisodeStage) })
  currentStage?: EpisodeStage;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: Record<string, any>;
}
