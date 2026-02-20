import { CharacterRelationStatus } from '@/generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FriendListItemDto {
  @ApiProperty()
  characterId: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarImage: string | null;

  @ApiProperty({ enum: CharacterRelationStatus })
  status: CharacterRelationStatus;
}

export class FriendChatItemDto {
  @ApiProperty()
  characterId: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarImage: string | null;

  @ApiProperty()
  chatId: number;

  @ApiPropertyOptional()
  lastMessageAt: Date | null;

  @ApiPropertyOptional()
  lastMessagePreview: string | null;

  @ApiProperty({ default: 0 })
  unreadCount: number;
}

export class FriendDetailDto {
  characterId: number;
  affinity: number;
}
