import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReqUser } from '@/common/decorators/user.decorator';
import { FriendService } from './friend.service';
import { FriendListItemDto } from './dto/friend-list-item.dto';

@Controller('v1/characters/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  @ApiOkResponse({ type: [FriendListItemDto] })
  async getFriends(
    @ReqUser('id') userId: number,
  ): Promise<FriendListItemDto[]> {
    return this.friendService.getFriends(userId);
  }
}
