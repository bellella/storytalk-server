import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class GenerateQuizDto {
  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  sourceDialogueId?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  sourceLogId?: number;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional()
  count?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  types?: string[];
}

export class GenerateQuizResponseDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  quizSnapshot?: Record<string, any>;

  @ApiPropertyOptional({ type: [Number] })
  quizIds?: number[];
}
