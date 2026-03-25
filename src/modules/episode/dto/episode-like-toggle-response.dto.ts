import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

export class EpisodeLikeToggleResponseDto extends SuccessResponseDto {
  @ApiProperty()
  episodeId: number;

  @ApiProperty()
  isLiked: boolean;
}
