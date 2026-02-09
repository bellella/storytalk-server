import { Allow, IsBoolean, IsInt, IsObject } from 'class-validator';

export class SubmitQuizAnswerDto {
  @IsInt()
  quizId: number;
  @IsObject()
  payload: Record<string, any>;
  @IsBoolean()
  isCorrect?: boolean;
}
