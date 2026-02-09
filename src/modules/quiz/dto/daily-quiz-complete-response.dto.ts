import { ApiProperty } from '@nestjs/swagger';
import { XpProgressDto } from '@/modules/xp/dto/xp-progress.dto';
import { QuizScoreDto } from './quiz-score.dto';

export class DailyQuizCompleteResponseDto {
  @ApiProperty({ type: XpProgressDto })
  xp: XpProgressDto;

  @ApiProperty({ type: QuizScoreDto })
  result: QuizScoreDto;
}

