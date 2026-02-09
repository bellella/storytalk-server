import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class UpdateEpisodeProgressDto {
  @ApiProperty({ description: '완료한 씬 ID' })
  @IsInt()
  sceneId: number;
}
