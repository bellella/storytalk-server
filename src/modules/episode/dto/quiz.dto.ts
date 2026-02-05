import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuizSourceType, QuizType } from '@/generated/prisma/enums';

export class QuizOptionDto {
  id: number;
  quizId: number;
  text: string;
  order: number;
}

export class QuizDto {
  id: number;

  @ApiProperty({ enum: Object.values(QuizSourceType) })
  sourceType: QuizSourceType;

  sourceId: number;

  @ApiProperty({ enum: Object.values(QuizType) })
  type: QuizType;

  questionEnglish: string;
  questionKorean?: string;
  answerIndex?: number;
  description?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: Record<string, any>;

  order?: number;
  isActive: boolean;
  options: QuizOptionDto[];
}
