import { ReqUser } from '@/common/decorators/user.decorator';
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { UserService } from './user.service';
import { RegisterProfileDto, UserDto, UserProfileDto } from './dto/user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Returns the profile of the currently logged-in user.
   */
  @Get('me')
  @ApiOkResponse({ type: UserProfileDto })
  async getMe(@ReqUser('id') userId: number): Promise<UserProfileDto> {
    return this.userService.findOne(userId);
  }

  /**
   * Updates the profile of the currently authenticated user.
   */
  @Patch('me')
  updatePersonalInfo(
    @Body() updatePersonalInfoDto: UpdatePersonalInfoDto,
    @ReqUser('id') userId: number
  ) {
    return this.userService.updatePersonalInfo(userId, updatePersonalInfoDto);
  }

  @Post('me/complete-profile')
  completeProfile(
    @Body() registerProfileDto: RegisterProfileDto,
    @ReqUser('id') userId: number
  ) {
    return this.userService.completeProfile(userId, registerProfileDto);
  }
}
