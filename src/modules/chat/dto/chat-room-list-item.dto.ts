import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRoomCharacterDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarImage?: string | null;
}

export class ChatRoomLastMessageDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  type: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isFromUser: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class ChatRoomListItemDto {
  @ApiProperty()
  chatId: number;

  @ApiProperty({ type: ChatRoomCharacterDto })
  character: ChatRoomCharacterDto;

  @ApiPropertyOptional({ type: ChatRoomLastMessageDto })
  lastMessage?: ChatRoomLastMessageDto | null;

  @ApiProperty({ default: 0 })
  unreadCount: number;

  @ApiProperty()
  isPinned: boolean;

  @ApiPropertyOptional()
  lastMessageAt?: Date | null;
}
