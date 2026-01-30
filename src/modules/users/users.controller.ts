import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { ReqUser } from '@/common/decorators/user.decorator';
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Returns the profile of the currently logged-in user.
   */
  @Get('me')
  getMe(@ReqUser('id') userId: number) {
    return this.usersService.findOne(userId);
  }

  /**
   * Updates the profile of the currently authenticated user.
   */
  @Patch('me')
  updatePersonalInfo(
    @Body() updatePersonalInfoDto: UpdatePersonalInfoDto,
    @ReqUser('id') userId: number
  ) {
    return this.usersService.updatePersonalInfo(userId, updatePersonalInfoDto);
  }
}
