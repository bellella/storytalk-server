import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizSessionType } from '@/generated/prisma/client';

export class QuizSessionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ enum: QuizSessionType })
  type: QuizSessionType;

  @ApiPropertyOptional()
  sourceId?: number | null;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  totalCount?: number | null;

  @ApiPropertyOptional()
  correctCount?: number | null;

  @ApiPropertyOptional()
  score?: number | null;
}
