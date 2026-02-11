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

  @ApiProperty()
  createdAt: Date;
}
