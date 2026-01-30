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
import { RequestWithUser } from '../types/request.types';
import { UserInfo } from '@ai-resume/types';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { User } from 'src/decorators/user.decorator';
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieves the user information for the currently authenticated user.
   */
  @Get('me')
  getUserInfo(@User('id') userId: string): Promise<UserInfo> {
    return this.usersService.getUserInfo(userId);
  }

  /**
   * Updates the profile of the currently authenticated user.
   */
  @Patch('me')
  updatePersonalInfo(
    @Body() updatePersonalInfoDto: UpdatePersonalInfoDto,
    @User('id') userId: string
  ) {
    return this.usersService.updatePersonalInfo(userId, updatePersonalInfoDto);
  }

  /**
   * Uploads a profile image for the currently authenticated user.
   */
  @Post('me/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadProfileImage(@UploadedFile() file: any) {
    return this.usersService.uploadProfileImage(file);
  }
}
