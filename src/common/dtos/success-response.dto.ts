import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional()
  message?: string;
}
