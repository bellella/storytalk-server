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
import { FriendListItemDto } from './dto/friend.dto';
import { SuccessResponseDto } from '@/common/dtos/success-response.dto';

@Controller('v1/characters/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post(':characterId/friends')
  @ApiOkResponse({ type: SuccessResponseDto })
  async addFriend(
    @ReqUser('id') userId: number,
    @Param('characterId', ParseIntPipe) characterId: number
  ): Promise<SuccessResponseDto> {
    return this.friendService.addFriend(userId, characterId);
  }

  @Get()
  @ApiOkResponse({ type: [FriendListItemDto] })
  async getFriends(
    @ReqUser('id') userId: number
  ): Promise<FriendListItemDto[]> {
    return this.friendService.getFriends(userId);
  }
}
