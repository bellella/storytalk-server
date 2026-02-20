import {
  Controller,
  Get,
  ParseIntPipe,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { FriendService } from './friend.service';
import { FriendChatItemDto, FriendListItemDto } from './dto/friend.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('characters/:characterId')
  @ApiOkResponse({ type: SuccessResponseDto })
  async addFriend(
    @ReqUser('id') userId: number,
    @Param('characterId', ParseIntPipe) characterId: number
  ): Promise<SuccessResponseDto> {
    return this.friendService.addFriend(userId, characterId);
  }

  @Post('characters/:characterId/invite')
  @ApiOkResponse({ type: SuccessResponseDto })
  async inviteFriend(
    @ReqUser('id') userId: number,
    @Param('characterId', ParseIntPipe) characterId: number
  ): Promise<SuccessResponseDto> {
    return this.friendService.inviteFriend(userId, characterId);
  }

  @Get()
  @ApiOkResponse({ type: [FriendListItemDto] })
  async getFriends(
    @ReqUser('id') userId: number
  ): Promise<FriendListItemDto[]> {
    return this.friendService.getFriends(userId);
  }

  @Get('chats')
  @ApiOkResponse({ type: [FriendChatItemDto] })
  async getFriendChats(
    @ReqUser('id') userId: number
  ): Promise<FriendChatItemDto[]> {
    return this.friendService.getFriendChats(userId);
  }

  // @Get('characters/:characterId')
  // @ApiOkResponse({ type: FriendDetailDto })
  // async getFriend(
  //   @ReqUser('id') userId: number,
  //   @Param('characterId', ParseIntPipe) characterId: number
  // ): Promise<FriendDetailDto> {
  //   return this.friendService.getFriend(userId, characterId);
  // }
}
