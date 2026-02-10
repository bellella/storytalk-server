import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  payload?: Record<string, any> | null;

  @ApiProperty()
  isFromUser: boolean;

  @ApiProperty()
  createdAt: Date;
}
