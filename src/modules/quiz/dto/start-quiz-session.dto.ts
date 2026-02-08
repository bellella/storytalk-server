import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizSessionType } from '@/generated/prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class StartQuizSessionDto {
  @ApiProperty({ enum: QuizSessionType })
  @IsEnum(QuizSessionType)
  type: QuizSessionType;

  @ApiPropertyOptional({ description: 'EPISODE 타입일 때 필수' })
  @IsOptional()
  @IsInt()
  episodeId?: number;
}
