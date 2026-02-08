import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional } from 'class-validator';

export class SubmitQuizAnswerDto {
  @ApiProperty()
  @IsInt()
  quizId: number;

  @ApiProperty({ type: 'object', additionalProperties: true, description: '퀴즈 답변 데이터' })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}
