import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FriendListItemDto {
  @ApiProperty()
  characterId: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarImage?: string | null;

  @ApiProperty()
  affinity: number;

  @ApiPropertyOptional()
  chatId?: number | null;

  @ApiPropertyOptional()
  lastMessageAt?: Date | null;

  @ApiPropertyOptional()
  lastMessagePreview?: string | null;

  @ApiProperty({ default: 0 })
  unreadCount: number;
}

export class FriendDetailDto {
  characterId: number;
  affinity: number;
}
