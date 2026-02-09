import { IsArray, IsBoolean, IsInt, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DailyQuizAnswerItemDto {
  @IsInt()
  quizId: number;

  @IsObject()
  payload: Record<string, any>;

  @IsBoolean()
  isCorrect: boolean;
}

export class SubmitDailyQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyQuizAnswerItemDto)
  answers: DailyQuizAnswerItemDto[];
}
