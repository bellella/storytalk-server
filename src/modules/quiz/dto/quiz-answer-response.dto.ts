import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuizAnswerResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  quizId: number;

  @ApiProperty()
  quizSessionId: number;

  @ApiPropertyOptional()
  isCorrect?: boolean | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  payload: Record<string, any>;

  @ApiProperty()
  createdAt: Date;
}
