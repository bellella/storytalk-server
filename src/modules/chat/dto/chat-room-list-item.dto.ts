import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRoomCharacterDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarImage?: string | null;
}

export class ChatRoomCharacterDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  koreanName?: string | null;

  @ApiPropertyOptional()
  avatarImage?: string | null;

  @ApiPropertyOptional()
  mainImage?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  personality?: string | null;

  @ApiPropertyOptional()
  greetingMessage?: string | null;
}

export class ChatRoomInfoDto {
  @ApiProperty()
  chatId: number;

  @ApiProperty({ type: ChatRoomCharacterDetailDto })
  character: ChatRoomCharacterDetailDto;

  @ApiProperty({ default: 0 })
  unreadCount: number;

  @ApiProperty()
  isPinned: boolean;

  @ApiPropertyOptional()
  lastMessageAt?: Date | null;
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

  @ApiProperty({ description: '표시용 시간 (예: 오후 3:58)' })
  createdAt: string;
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
