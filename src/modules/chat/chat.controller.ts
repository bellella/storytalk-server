import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { ChatService } from './chat.service';
import { ChatRoomListItemDto } from './dto/chat-room-list-item.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendMessageResponseDto } from './dto/send-message-response.dto';
import { CursorRequestDto } from '@/common/dtos/cursor-request.dto';
import { CursorResponseDto } from '@/common/dtos/cursor-response.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

class ChatMessagesResponseDto implements CursorResponseDto<ChatMessageDto> {
  @ApiProperty({ type: [ChatMessageDto] })
  items: ChatMessageDto[];
}

@Controller('v1/chats/characters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiOkResponse({ type: [ChatRoomListItemDto] })
  async getChatRooms(
    @ReqUser('id') userId: number
  ): Promise<ChatRoomListItemDto[]> {
    return this.chatService.getChatRooms(userId);
  }

  @Get(':chatId/messages')
  @ApiOkResponse({ type: ChatMessagesResponseDto })
  async getMessages(
    @ReqUser('id') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query() query: CursorRequestDto
  ): Promise<ChatMessagesResponseDto> {
    return this.chatService.getMessages(chatId, userId, query);
  }

  @Post(':characterId/messages')
  @ApiOkResponse({ type: SendMessageResponseDto })
  async sendMessage(
    @ReqUser('id') userId: number,
    @Param('characterId', ParseIntPipe) characterId: number,
    @Body() dto: SendMessageDto
  ): Promise<SendMessageResponseDto> {
    return this.chatService.sendMessage(userId, characterId, dto);
  }

  @Post(':chatId/read')
  @ApiOkResponse({ type: SuccessResponseDto })
  async markAsRead(
    @ReqUser('id') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number
  ): Promise<SuccessResponseDto> {
    await this.chatService.markAsRead(chatId, userId);
    return { success: true };
  }
}
