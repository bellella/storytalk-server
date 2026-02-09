import { ApiProperty } from '@nestjs/swagger';
import { QuizDto } from '../../episode/dto/quiz.dto';
import { QuizSessionResponseDto } from './quiz-session-response.dto';

export class DailyQuizResponseDto {
  @ApiProperty()
  session: QuizSessionResponseDto;

  @ApiProperty({ type: [QuizDto] })
  quizzes: QuizDto[];

  @ApiProperty({ description: '오늘의 퀴즈 완료 여부' })
  isCompleted: boolean;
}
