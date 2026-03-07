import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessagePayloadDto {
  original: string;

  corrected: string;

  translated: string;
}

export class ChatMessageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  payload?: MessagePayloadDto;

  @ApiProperty()
  isFromUser: boolean;

  @ApiProperty({ description: '표시용 시간 (예: 오후 3:58)' })
  createdAt: string;
}
