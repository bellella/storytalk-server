import { ApiProperty } from '@nestjs/swagger';

export class QuizScoreDto {
  @ApiProperty({ description: '전체 문항 수' })
  totalCount: number;

  @ApiProperty({ description: '맞춘 문항 수' })
  correctCount: number;

  @ApiProperty({ description: '점수(정답률, 0~100%)' })
  score: number;
}

